// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PurchaseWrapper
 * @author The Sandbox
 * @notice Contract that facilitates NFT purchases using SAND.
 * @custom:security-contact contact-blockchain@sandbox.game
 * @dev Implements IERC721Receiver to handle NFT receipts. Uses Ownable for admin functions.
 */
contract PurchaseWrapper is Ownable, IERC721Receiver {
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
     * @notice Address of the SAND token used for purchases.
     */
    IERC20 public sandToken;

    /**
     * @notice Mapping from a local temporary token ID to the details of the purchase.
     * @dev This `localTokenId` is provided by the caller during `confirmPurchase` and is used
     * to uniquely identify a purchase transaction and later to reference the minted NFT
     * in the wrapper's transfer functions.
     */
    mapping(uint256 localTokenId => PurchaseInfo) private _purchaseInfo;

    // Transaction context variables: these are set by confirmPurchase and read by onERC721Received
    // within the same transaction. They effectively act as parameters passed through an external call.
    address private _txContext_caller;
    address private _txContext_expectedCollection;
    uint256 private _txContext_localTokenId;

    /**
     * @notice Emitted when an NFT purchase is confirmed and the minting process is initiated.
     * @param originalSender The address that initiated the purchase.
     * @param nftCollection The address of the NFT collection.
     * @param localTokenId The temporary local token ID for this purchase.
     * @param amount The amount of `sandToken` used for the purchase.
     */
    event PurchaseConfirmed(
        address indexed originalSender,
        address indexed nftCollection,
        uint256 indexed localTokenId,
        uint256 amount
    );

    /**
     * @notice Emitted when an NFT is successfully received by this contract and transferred to the original sender.
     * @param localTokenId The temporary local token ID associated with this purchase.
     * @param nftCollection The address of the NFT collection.
     * @param nftTokenId The actual ID of the minted NFT.
     * @param originalSender The address that received the NFT.
     */
    event NftReceivedAndForwarded(
        uint256 indexed localTokenId,
        address indexed nftCollection,
        uint256 nftTokenId,
        address indexed originalSender
    );

    /**
     * @notice Emitted when an NFT is transferred using the wrapper's transfer functions.
     * @param localTokenId The local token ID representing the NFT.
     * @param from The address from which the NFT is transferred.
     * @param to The address to which the NFT is transferred.
     * @param nftTokenId The actual ID of the transferred NFT.
     */
    event NftTransferredViaWrapper(
        uint256 indexed localTokenId,
        address indexed from,
        address indexed to,
        uint256 nftTokenId
    );

    // Custom Errors
    error PurchaseWrapper__SandTokenAddressCannotBeZero();
    error PurchaseWrapper__SenderAddressCannotBeZero();
    error PurchaseWrapper__NftCollectionAddressCannotBeZero();
    error PurchaseWrapper__LocalTokenIdAlreadyInUse(uint256 localTokenId);
    error PurchaseWrapper__NftPurchaseFailedViaApproveAndCall();
    error PurchaseWrapper__ReceivedNftFromUnexpectedCollection(address expected, address actual);
    error PurchaseWrapper__PurchaseContextNotSet();
    error PurchaseWrapper__MismatchInPurchaseContext(
        address expectedCaller,
        address actualCaller,
        uint256 localTokenId
    );
    error PurchaseWrapper__InvalidRecipientAddress();
    error PurchaseWrapper__NoSandTokensToRecover();
    error PurchaseWrapper__TransferToZeroAddress();
    error PurchaseWrapper__InvalidLocalTokenIdOrPurchaseNotCompleted(uint256 localTokenId);
    error PurchaseWrapper__NftNotYetMintedOrRecorded(uint256 localTokenId);
    error PurchaseWrapper__NftCollectionNotRecorded(uint256 localTokenId);
    error PurchaseWrapper__FromAddressIsNotOriginalRecipient(address expected, address actual);
    error PurchaseWrapper__CallerMustBeFromAddress(address expected, address actual);

    /**
     * @notice Constructor to set the SAND token contract address.
     * @param initialOwner The initial owner of this contract.
     * @param _sandToken Address of the Sand (ERC20) token contract.
     */
    constructor(address initialOwner, address _sandToken) Ownable(initialOwner) {
        if (_sandToken == address(0)) revert PurchaseWrapper__SandTokenAddressCannotBeZero();
        sandToken = IERC20(_sandToken);
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
     * @param amount The amount of `sandToken` to be transferred for the purchase.
     * @param waveIndex The wave index for minting on the NFT Collection.
     * @param signatureId The signature ID for verification by the NFT Collection.
     * @param randomTempTokenId A unique temporary ID chosen by the caller to identify this purchase.
     *                          This ID will be associated with the minted NFT.
     * @param signature The signature data for verification by the NFT Collection.
     * @return bytes The return data from the `approveAndCall` to the `sandToken`, typically the result of the NFT minting call.
     */
    function confirmPurchase(
        address sender,
        address nftCollection,
        uint256 amount,
        uint256 waveIndex,
        uint256 signatureId,
        uint256 randomTempTokenId,
        bytes calldata signature
    ) external returns (bytes memory) {
        if (sender == address(0)) revert PurchaseWrapper__SenderAddressCannotBeZero();
        if (nftCollection == address(0)) revert PurchaseWrapper__NftCollectionAddressCannotBeZero();
        if (_purchaseInfo[randomTempTokenId].nftTokenId != 0)
            revert PurchaseWrapper__LocalTokenIdAlreadyInUse(randomTempTokenId);

        _txContext_expectedCollection = nftCollection;
        _txContext_localTokenId = randomTempTokenId;
        _txContext_caller = sender;

        // Store initial purchase info. nftTokenId and nftCollection will be set in onERC721Received.
        _purchaseInfo[randomTempTokenId].caller = sender;

        // Transfer sand tokens from sender to this contract
        SafeERC20.safeTransferFrom(sandToken, sender, address(this), amount);

        // Prepare the data for calling waveMint on the NFT Collection
        // Function selector for waveMint(address,uint256,uint256,uint256,bytes)
        bytes4 waveMintSelector = bytes4(keccak256("waveMint(address,uint256,uint256,uint256,bytes)"));

        bytes memory data = abi.encodeWithSelector(
            waveMintSelector,
            address(this), // NFTs will be minted to this contract first
            1, // the current implementation and external party only support 1 NFT per purchase
            waveIndex,
            signatureId,
            signature
        );

        // Call approveAndCall on the payment token to initiate the mint
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returnData) = address(sandToken).call(
            abi.encodeWithSelector(
                // Selector for approveAndCall(address,uint256,bytes)
                bytes4(keccak256("approveAndCall(address,uint256,bytes)")),
                nftCollection,
                amount,
                data
            )
        );

        if (!success) {
            // Refund the sender if the call failed
            SafeERC20.safeTransfer(sandToken, sender, amount);
            // Clear partial purchase info if it was only sender dependent before this point.
            _purchaseInfo[randomTempTokenId].caller = address(0);
            revert PurchaseWrapper__NftPurchaseFailedViaApproveAndCall();
        }

        emit PurchaseConfirmed(sender, nftCollection, randomTempTokenId, amount);
        return returnData;
    }

    /**
     * @notice Handles the receipt of an ERC721 token, expected to be called by an NFT collection
     *         contract after a successful mint initiated by `confirmPurchase`.
     * @dev This function uses the transaction-scoped context variables (`_txContext_...`) set by
     *      `confirmPurchase` to identify the purchase and original sender. It then stores the
     *      actual `tokenId` and `nftCollection` in the `_purchaseInfo` mapping and transfers
     *      the NFT to the `_txContext_originalSender`.
     * @param operator The address which called the `safeTransferFrom` function (unused).
     * @param from The address which previously owned the token (unused, typically address(0) for mint).
     * @param tokenId The ID of the token being transferred to this contract.
     * @param data Additional data with no specified format (unused).
     * @return bytes4 The selector `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`.
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        if (msg.sender != _txContext_expectedCollection)
            revert PurchaseWrapper__ReceivedNftFromUnexpectedCollection(msg.sender, _txContext_expectedCollection);
        if (_txContext_caller == address(0)) revert PurchaseWrapper__PurchaseContextNotSet(); // Should always be set if flow is correct

        PurchaseInfo storage info = _purchaseInfo[_txContext_localTokenId];
        // Ensure this localTokenId was indeed part of an active purchase context
        if (info.caller != _txContext_caller)
            revert PurchaseWrapper__MismatchInPurchaseContext(info.caller, _txContext_caller, _txContext_localTokenId);

        info.nftTokenId = tokenId;
        info.nftCollection = msg.sender; // Record the actual collection address

        IERC721(msg.sender).transferFrom(address(this), _txContext_caller, tokenId);

        emit NftReceivedAndForwarded(_txContext_localTokenId, msg.sender, tokenId, _txContext_caller);

        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @notice Recovers SAND tokens (or other ERC20 specified in `sandToken`)
     *         that were accidentally sent or accumulated in this contract.
     * @dev Only callable by the contract owner.
     * @param recipient Address to receive the recovered ERC20 tokens.
     */
    function recoverSand(address recipient) external onlyOwner {
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
        if (to == address(0)) revert PurchaseWrapper__TransferToZeroAddress();
        PurchaseInfo storage info = _purchaseInfo[localTokenId];

        if (info.caller == address(0)) revert PurchaseWrapper__InvalidLocalTokenIdOrPurchaseNotCompleted(localTokenId);
        if (info.nftTokenId == 0) revert PurchaseWrapper__NftNotYetMintedOrRecorded(localTokenId);
        if (info.nftCollection == address(0)) revert PurchaseWrapper__NftCollectionNotRecorded(localTokenId);
        if (from != info.caller) revert PurchaseWrapper__FromAddressIsNotOriginalRecipient(from, info.caller);
        if (msg.sender != from) revert PurchaseWrapper__CallerMustBeFromAddress(msg.sender, from);

        IERC721(info.nftCollection).safeTransferFrom(from, to, info.nftTokenId);
        emit NftTransferredViaWrapper(localTokenId, from, to, info.nftTokenId);
    }
}
