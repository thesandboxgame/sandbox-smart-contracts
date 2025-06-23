// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {INFTCollection} from "./INFTCollection.sol";

/**
 * @dev Minimal interface for the SAND token contract.
 */
interface ISandboxSand {
    function approveAndCall(address spender, uint256 amount, bytes calldata data) external;
}

/**
 * @title PurchaseWrapper
 * @author The Sandbox
 * @notice Contract that facilitates NFT purchases using SAND.
 * @custom:security-contact contact-blockchain@sandbox.game
 * @dev Implements IERC721Receiver to handle NFT receipts. Uses Ownable for admin functions.
 */
contract PurchaseWrapper is AccessControl, IERC721Receiver, ReentrancyGuard {
    /**
     * @dev Stores information about a purchase linked to a local temporary token ID.
     * @param caller The EOA who called the `confirmPurchase` function.
     * @param nftCollection The address of the NFT collection contract from which the NFT was/will be minted.
     * @param nftTokenId The actual token ID of the minted NFT. It is 0 until the NFT is minted and received by this contract.
     */
    struct PurchaseInfo {
        address caller;
        address nftCollection;
        uint256 nftTokenId;
    }

    /**
     * @notice The role that is authorized to call this contract's functions.
     */
    bytes32 public constant AUTHORIZED_CALLER_ROLE = keccak256("AUTHORIZED_CALLER_ROLE");

    /**
     * @notice Address of the SAND token used for purchases.
     */
    IERC20 public sandToken;

    /**
     * @notice Mapping from a local temporary token ID to the details of the purchase.
     * @dev This `localTokenId` is provided by the caller during `confirmPurchase` and is used
     *      to uniquely identify a purchase transaction and later to reference the minted NFT
     *      in the wrapper's transfer functions.
     */
    mapping(uint256 localTokenId => PurchaseInfo) private _purchaseInfo;

    /**
     * @notice Transaction context variable: it is set by confirmPurchase and read by onERC721Received
     *         within the same transaction. It effectively acts as a parameter passed through an external call.
     */
    uint256 private _txContextLocalTokenId;

    /**
     * @notice A variable to track if the contract is in the confirmPurchase function.
     *         It is set to true in confirmPurchase and reset to false in onERC721Received.
     */
    bool private _isInConfirmPurchase;

    /**
     * @notice Emitted when an NFT purchase is confirmed and the minting process is initiated.
     * @param originalSender The address that initiated the purchase.
     * @param nftCollection The address of the NFT collection.
     * @param localTokenId The temporary local token ID for this purchase.
     * @param nftTokenId The actual ID of the minted NFT.
     */
    event PurchaseConfirmed(address originalSender, address nftCollection, uint256 localTokenId, uint256 nftTokenId);

    /**
     * @notice Emitted when an NFT is transferred using the wrapper's transfer functions.
     * @param localTokenId The local token ID representing the NFT.
     * @param from The address from which the NFT is transferred.
     * @param to The address to which the NFT is transferred.
     * @param nftTokenId The actual ID of the transferred NFT.
     */
    event NftTransferredViaWrapper(uint256 localTokenId, address from, address to, uint256 nftTokenId);

    // Custom Errors
    error PurchaseWrapper__SandTokenAddressCannotBeZero();
    error PurchaseWrapper__NftCollectionAddressCannotBeZero();
    error PurchaseWrapper__LocalTokenIdAlreadyInUse(uint256 localTokenId);
    error PurchaseWrapper__NftPurchaseFailedViaApproveAndCall();
    error PurchaseWrapper__ReceivedNftFromUnexpectedCollection(address expected, address actual);
    error PurchaseWrapper__InvalidRecipientAddress();
    error PurchaseWrapper__NoSandTokensToRecover();
    error PurchaseWrapper__TransferToZeroAddress();
    error PurchaseWrapper__InvalidLocalTokenIdOrPurchaseNotCompleted(uint256 localTokenId);
    error PurchaseWrapper__NftNotYetMintedOrRecorded(uint256 localTokenId);
    error PurchaseWrapper__NftCollectionNotRecorded(uint256 localTokenId);
    error PurchaseWrapper__FromAddressIsNotOriginalRecipient(address expected, address actual);
    error PurchaseWrapper__CallerNotAuthorized(address caller);
    error PurchaseWrapper__SenderIsNotSandToken();
    error PurchaseWrapper__RandomTempTokenIdCannotBeZero();
    error PurchaseWrapper__NotInConfirmPurchase();

    /**
     * @notice Constructor to set the SAND token contract address.
     * @param _admin The initial owner of this contract.
     * @param _sandToken Address of the Sand (ERC20) token contract.
     */
    constructor(address _admin, address _sandToken, address _authorizedCaller) {
        if (_sandToken == address(0)) revert PurchaseWrapper__SandTokenAddressCannotBeZero();
        sandToken = IERC20(_sandToken);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(AUTHORIZED_CALLER_ROLE, _authorizedCaller);
    }

    /**
     * @notice Confirms a purchase request, takes payment, and initiates the NFT minting process
     *         by calling `approveAndCall` on the `sandToken` contract, which in turn calls
     *         the `waveMint` (or similar) function on the `nftCollection` contract.
     * @dev The `randomTempTokenId` must be unique for each purchase attempt and is used to track
     *      the purchase through to NFT delivery. This function sets transaction-scoped context
     *      variables (`_txContext_...`) that are used by `onERC721Received`.
     * @param sender The original EOA initiating the purchase and who will receive the NFT.
     * @param nftCollection Address of the target NFT Collection contract for minting.
     * @param waveIndex The wave index for minting on the NFT Collection.
     * @param signatureId The signature ID for verification by the NFT Collection.
     * @param randomTempTokenId A unique temporary ID chosen by the caller to identify this purchase.
     *                          This ID will be associated with the minted NFT.
     * @param signature The signature data for verification by the NFT Collection.
     */
    function confirmPurchase(
        address sender,
        address nftCollection,
        uint256 waveIndex,
        uint256 signatureId,
        uint256 randomTempTokenId,
        bytes calldata signature
    ) external nonReentrant {
        _validateAndAuthorizePurchase(sender, nftCollection, randomTempTokenId);

        uint256 sandAmount = INFTCollection(nftCollection).waveSingleTokenPrice(waveIndex);

        _txContextLocalTokenId = randomTempTokenId;
        _isInConfirmPurchase = true;

        _purchaseInfo[randomTempTokenId].caller = sender;
        _purchaseInfo[randomTempTokenId].nftCollection = nftCollection;

        SafeERC20.safeTransferFrom(sandToken, sender, address(this), sandAmount);

        _initiateMintViaApproveAndCall(nftCollection, sandAmount, waveIndex, signatureId, signature);

        IERC721(nftCollection).transferFrom(address(this), sender, _purchaseInfo[randomTempTokenId].nftTokenId);

        emit PurchaseConfirmed(sender, nftCollection, randomTempTokenId, _purchaseInfo[randomTempTokenId].nftTokenId);
    }

    function _validateAndAuthorizePurchase(
        address sender,
        address nftCollection,
        uint256 randomTempTokenId
    ) private view {
        if (msg.sender != address(sandToken) || !hasRole(AUTHORIZED_CALLER_ROLE, sender)) {
            revert PurchaseWrapper__CallerNotAuthorized(sender);
        }

        if (randomTempTokenId == 0) revert PurchaseWrapper__RandomTempTokenIdCannotBeZero();
        if (nftCollection == address(0)) revert PurchaseWrapper__NftCollectionAddressCannotBeZero();
        if (_purchaseInfo[randomTempTokenId].nftTokenId != 0) {
            revert PurchaseWrapper__LocalTokenIdAlreadyInUse(randomTempTokenId);
        }
    }

    function _initiateMintViaApproveAndCall(
        address nftCollection,
        uint256 sandAmount,
        uint256 waveIndex,
        uint256 signatureId,
        bytes calldata signature
    ) private {
        bytes memory data = abi.encodeCall(
            INFTCollection.waveMint,
            (
                address(this), // NFTs will be minted to this contract first
                1,
                waveIndex,
                signatureId,
                signature
            )
        );

        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = address(sandToken).call(
            abi.encodeCall(ISandboxSand.approveAndCall, (nftCollection, sandAmount, data))
        );

        if (!success) {
            revert PurchaseWrapper__NftPurchaseFailedViaApproveAndCall();
        }
    }

    /**
     * @notice Handles the receipt of an ERC721 token, expected to be called by an NFT collection
     *         contract after a successful mint initiated by `confirmPurchase`.
     * @dev This function uses the transaction-scoped context variables (`_txContext_...`) set by
     *      `confirmPurchase` to identify the purchase and original sender. It then stores the
     *      actual `tokenId` and `nftCollection` in the `_purchaseInfo` mapping and transfers
     *      the NFT to the `_txContext_originalSender`.
     * @param tokenId The ID of the token being transferred to this contract.
     * @return bytes4 The selector `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
     */
    function onERC721Received(address, address, uint256 tokenId, bytes calldata) external override returns (bytes4) {
        if (!_isInConfirmPurchase) revert PurchaseWrapper__NotInConfirmPurchase();
        PurchaseInfo storage info = _purchaseInfo[_txContextLocalTokenId];

        if (msg.sender != info.nftCollection)
            revert PurchaseWrapper__ReceivedNftFromUnexpectedCollection(info.nftCollection, msg.sender);

        info.nftTokenId = tokenId;
        _isInConfirmPurchase = false;

        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @notice Retrieves the purchase information for a given local token ID.
     * @param localTokenId The local temporary token ID of the purchase.
     * @return A `PurchaseInfo` struct containing the details of the purchase.
     */
    function getPurchaseInfo(uint256 localTokenId) external view returns (PurchaseInfo memory) {
        return _purchaseInfo[localTokenId];
    }

    /**
     * @notice Recovers SAND tokens (or other ERC20 specified in `sandToken`)
     *         that were accidentally sent or accumulated in this contract.
     * @dev Only callable by the contract owner.
     * @param recipient Address to receive the recovered ERC20 tokens.
     */
    function recoverSand(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert PurchaseWrapper__InvalidRecipientAddress();
        uint256 balance = sandToken.balanceOf(address(this));
        if (balance == 0) revert PurchaseWrapper__NoSandTokensToRecover();

        SafeERC20.safeTransfer(sandToken, recipient, balance);
    }

    /**
     * @notice Safely transfers an NFT associated with a `localTokenId` using `safeTransferFrom`.
     * @dev Similar to `transferFrom` but uses `safeTransferFrom` for the actual NFT transfer.
     *      The `msg.sender` must be the `from` address.
     * @param from The current owner of the NFT.
     * @param to The new address to receive the NFT.
     * @param localTokenId The local temporary token ID.
     */
    function safeTransferFrom(address from, address to, uint256 localTokenId) external {
        if (!hasRole(AUTHORIZED_CALLER_ROLE, msg.sender)) {
            revert PurchaseWrapper__CallerNotAuthorized(msg.sender);
        }
        if (to == address(0)) revert PurchaseWrapper__TransferToZeroAddress();
        PurchaseInfo storage info = _purchaseInfo[localTokenId];

        if (info.caller == address(0)) revert PurchaseWrapper__InvalidLocalTokenIdOrPurchaseNotCompleted(localTokenId);
        if (info.nftTokenId == 0) revert PurchaseWrapper__NftNotYetMintedOrRecorded(localTokenId);
        if (info.nftCollection == address(0)) revert PurchaseWrapper__NftCollectionNotRecorded(localTokenId);
        if (info.caller != from) revert PurchaseWrapper__FromAddressIsNotOriginalRecipient(from, info.caller);

        IERC721(info.nftCollection).safeTransferFrom(from, to, info.nftTokenId);

        emit NftTransferredViaWrapper(localTokenId, from, to, info.nftTokenId);
    }
}
