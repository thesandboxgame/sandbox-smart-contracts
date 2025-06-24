// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {INFTCollection} from "./INFTCollection.sol";
import {ISandboxSand} from "./ISandboxSand.sol";

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
    mapping(uint256 localTokenId => PurchaseInfo purchaseInfo) private _purchaseInfo;

    /**
     * @notice Emitted when an NFT purchase is confirmed and the minting process is initiated.
     * @param originalSender The address that initiated the purchase.
     * @param nftCollection The address of the NFT collection.
     * @param localTokenId The temporary local token ID for this purchase.
     * @param nftTokenId The actual ID of the minted NFT.
     */
    event PurchaseConfirmed(
        address indexed originalSender,
        address indexed nftCollection,
        uint256 localTokenId,
        uint256 indexed nftTokenId
    );

    /**
     * @notice Emitted when an NFT is transferred using the wrapper's transfer functions.
     * @param localTokenId The local token ID representing the NFT.
     * @param from The address from which the NFT is transferred.
     * @param to The address to which the NFT is transferred.
     * @param nftTokenId The actual ID of the transferred NFT.
     */
    event NftTransferredViaWrapper(
        uint256 localTokenId,
        address indexed from,
        address indexed to,
        uint256 indexed nftTokenId
    );

    // Custom Errors
    error PurchaseWrapperSandTokenAddressCannotBeZero();
    error PurchaseWrapperNftCollectionAddressCannotBeZero();
    error PurchaseWrapperLocalTokenIdAlreadyInUse(uint256 localTokenId);
    error PurchaseWrapperNftPurchaseFailedViaApproveAndCall();
    error PurchaseWrapperReceivedNftFromUnexpectedCollection(address expected, address actual);
    error PurchaseWrapperInvalidRecipientAddress();
    error PurchaseWrapperNoSandTokensToRecover();
    error PurchaseWrapperTransferToZeroAddress();
    error PurchaseWrapperInvalidLocalTokenIdOrPurchaseNotCompleted(uint256 localTokenId);
    error PurchaseWrapperNftNotYetMintedOrRecorded(uint256 localTokenId);
    error PurchaseWrapperNftCollectionNotRecorded(uint256 localTokenId);
    error PurchaseWrapperFromAddressIsNotOriginalRecipient(address expected, address actual);
    error PurchaseWrapperCallerNotAuthorized(address caller);
    error PurchaseWrapperSenderIsNotSandToken();
    error PurchaseWrapperRandomTempTokenIdCannotBeZero();
    error PurchaseWrapperNotInConfirmPurchase();

    /**
     * @notice Constructor to set the SAND token contract address.
     * @param _admin The initial owner of this contract.
     * @param _sandToken Address of the Sand (ERC20) token contract.
     */
    constructor(address _admin, address _sandToken, address _authorizedCaller) {
        if (_sandToken == address(0)) revert PurchaseWrapperSandTokenAddressCannotBeZero();
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

        PurchaseInfo storage info = _purchaseInfo[randomTempTokenId];
        info.caller = sender;
        info.nftCollection = nftCollection;

        IERC20 sandTokenCached = sandToken;
        SafeERC20.safeTransferFrom(sandTokenCached, sender, address(this), sandAmount);

        uint256 nftTokenId = _initiateMintViaApproveAndCall(
            nftCollection,
            sandAmount,
            waveIndex,
            signatureId,
            signature
        );

        info.nftTokenId = nftTokenId;

        IERC721(nftCollection).transferFrom(address(this), sender, nftTokenId);

        emit PurchaseConfirmed(sender, nftCollection, randomTempTokenId, nftTokenId);
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
            revert PurchaseWrapperCallerNotAuthorized(msg.sender);
        }
        if (to == address(0)) revert PurchaseWrapperTransferToZeroAddress();
        PurchaseInfo memory info = _purchaseInfo[localTokenId];

        if (info.caller == address(0)) revert PurchaseWrapperInvalidLocalTokenIdOrPurchaseNotCompleted(localTokenId);
        if (info.nftTokenId == 0) revert PurchaseWrapperNftNotYetMintedOrRecorded(localTokenId);
        if (info.nftCollection == address(0)) revert PurchaseWrapperNftCollectionNotRecorded(localTokenId);
        if (info.caller != from) revert PurchaseWrapperFromAddressIsNotOriginalRecipient(from, info.caller);

        IERC721(info.nftCollection).safeTransferFrom(from, to, info.nftTokenId);

        emit NftTransferredViaWrapper(localTokenId, from, to, info.nftTokenId);
    }

    /**
     * @notice Recovers SAND tokens (or other ERC20 specified in `sandToken`)
     *         that were accidentally sent or accumulated in this contract.
     * @dev Only callable by the contract owner.
     * @param recipient Address to receive the recovered ERC20 tokens.
     */
    function recoverSand(address recipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (recipient == address(0)) revert PurchaseWrapperInvalidRecipientAddress();
        IERC20 sandTokenCached = sandToken;
        uint256 balance = sandTokenCached.balanceOf(address(this));
        if (balance == 0) revert PurchaseWrapperNoSandTokensToRecover();

        SafeERC20.safeTransfer(sandTokenCached, recipient, balance);
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
     * @notice Handles the receipt of an ERC721 token, expected to be called by an NFT collection
     *         contract after a successful mint initiated by `confirmPurchase`.
     * @dev This function is a simple pass-through to conform to the IERC721Receiver interface.
     *      The core logic has been moved into `confirmPurchase`.
     * @return bytes4 The selector `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
     */
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function _initiateMintViaApproveAndCall(
        address nftCollection,
        uint256 sandAmount,
        uint256 waveIndex,
        uint256 signatureId,
        bytes calldata signature
    ) private returns (uint256) {
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
        (bool success, bytes memory result) = address(sandToken).call(
            abi.encodeCall(ISandboxSand.approveAndCall, (nftCollection, sandAmount, data))
        );

        if (!success) {
            revert PurchaseWrapperNftPurchaseFailedViaApproveAndCall();
        }
        uint256[] memory tokenIds = new uint256[](1);
        // The return data from `approveAndCall` is a `bytes` type, which means the actual return data from `waveMint` (an abi-encoded uint256[])
        // is itself abi-encoded. We need to go deeper.
        // `result` raw data layout:
        // - 0x00: offset to bytes data (0x20)
        // - 0x20: length of bytes data (e.g., 96 for a single uint256 in an array)
        // - 0x40: start of the `waveMint` return data
        //   - 0x40: offset to array data (0x20)
        //   - 0x60: array length (1)
        //   - 0x80: the token ID
        if (result.length < 160) {
            revert PurchaseWrapperNftPurchaseFailedViaApproveAndCall();
        }
        bytes32 tokenIdWord;
        assembly {
            // We read the word at offset 0x80 in the raw return data.
            // The `result` variable is a memory pointer, and its data starts at an offset of 0x20.
            // So we read from result + 0x20 (start of data) + 0x80 (offset to tokenId) = result + 0xa0
            tokenIdWord := mload(add(result, 0xa0))
        }
        tokenIds[0] = uint256(tokenIdWord);
        return tokenIds[0];
    }

    function _validateAndAuthorizePurchase(
        address sender,
        address nftCollection,
        uint256 randomTempTokenId
    ) private view {
        if (msg.sender != address(sandToken) || !hasRole(AUTHORIZED_CALLER_ROLE, sender)) {
            revert PurchaseWrapperCallerNotAuthorized(sender);
        }

        if (randomTempTokenId == 0) revert PurchaseWrapperRandomTempTokenIdCannotBeZero();
        if (nftCollection == address(0)) revert PurchaseWrapperNftCollectionAddressCannotBeZero();
        if (_purchaseInfo[randomTempTokenId].nftTokenId != 0) {
            revert PurchaseWrapperLocalTokenIdAlreadyInUse(randomTempTokenId);
        }
    }
}
