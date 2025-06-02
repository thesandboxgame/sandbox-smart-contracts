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
 * @notice Contract that facilitates NFT purchases using ERC20 tokens (e.g., SAND).
 * It acts as an intermediary: users approve this contract to spend their ERC20 tokens,
 * then call `confirmPurchase`. This contract takes the ERC20 tokens and calls an
 * `approveAndCall` function on the ERC20 token contract, targeting the NFT collection's
 * minting function. The NFT is minted to this wrapper contract, which then, upon receiving
 * the NFT via `onERC721Received`, transfers it to the original purchaser.
 * The contract also provides ERC721-like transfer functions that operate on a temporary
 * `localTokenId` which maps to the actual minted NFT, allowing the original purchaser
 * to transfer the NFT through this wrapper.
 * @custom:security-contact contact-blockchain@sandbox.game
 * @dev Implements IERC721Receiver to handle NFT receipts. Uses Ownable for admin functions.
 */
contract PurchaseWrapper is Ownable, IERC721Receiver {
    /**
     * @notice Address of the SAND (or other ERC20) token used for purchases.
     */
    IERC20 public sandToken;

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

    /**
     * @notice Constructor to set the SAND token contract address.
     * @param initialOwner The initial owner of this contract.
     * @param _sandToken Address of the Sand (ERC20) token contract.
     */
    constructor(address initialOwner, address _sandToken) Ownable(initialOwner) {
        require(_sandToken != address(0), "PW: SAND token address cannot be zero");
        sandToken = IERC20(_sandToken);
    }

    /**
     * @notice Confirms a purchase request, takes payment, and initiates the NFT minting process
     *         by calling `approveAndCall` on the `sandToken` contract, which in turn calls
     *         the `waveMint` (or similar) function on the `nftCollection` contract.
     * @dev The `randomTempTokenId` must be unique for each purchase attempt and is used to track
     *      the purchase through to NFT delivery. This function sets transaction-scoped context
     *      variables (`_txContext_...`) that are used by `onERC721Received`.
     * @param sender The original EOA initiating the purchase and who will ultimately receive the NFT.
     * @param nftCollection Address of the target NFT Collection contract for minting.
     * @param amount The amount of `sandToken` to be transferred for the purchase.
     * @param waveIndex The wave index for minting on the NFT Collection.
     * @param tokenAmount The number of NFTs to mint.
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
        uint256 tokenAmount,
        uint256 signatureId,
        uint256 randomTempTokenId,
        bytes calldata signature
    ) external returns (bytes memory) {
        require(sender != address(0), "PW: Sender address cannot be zero");
        require(nftCollection != address(0), "PW: NFT Collection address cannot be zero");
        require(_purchaseInfo[randomTempTokenId].nftTokenId == 0, "PW: Local token ID already in use");

        _txContext_expectedCollection = nftCollection;
        _txContext_localTokenId = randomTempTokenId;
        _txContext_caller = sender;

        // Store initial purchase info. nftTokenId will be set in onERC721Received.
        _purchaseInfo[randomTempTokenId].caller = sender;
        // _purchaseInfo[randomTempTokenId].nftCollection will be set in onERC721Received from msg.sender
        // to confirm it came from the expected collection.

        // Transfer sand tokens from sender to this contract
        SafeERC20.safeTransferFrom(sandToken, sender, address(this), amount);

        // Prepare the data for calling waveMint on the NFT Collection
        // Function selector for waveMint(address,uint256,uint256,uint256,bytes)
        bytes4 waveMintSelector = bytes4(keccak256("waveMint(address,uint256,uint256,uint256,bytes)"));

        bytes memory data = abi.encodeWithSelector(
            waveMintSelector,
            address(this), // NFTs will be minted to this contract first
            tokenAmount,
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
            revert("PW: NFT purchase failed via approveAndCall");
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
        address operator, // solhint-disable-line no-unused-vars
        address from, // solhint-disable-line no-unused-vars
        uint256 tokenId,
        bytes calldata data // solhint-disable-line no-unused-vars
    ) external override returns (bytes4) {
        require(msg.sender == _txContext_expectedCollection, "PW: Received NFT from unexpected collection");
        require(_txContext_caller != address(0), "PW: Purchase context not set"); // Should always be set if flow is correct

        PurchaseInfo storage info = _purchaseInfo[_txContext_localTokenId];
        // Ensure this localTokenId was indeed part of an active purchase context
        require(info.caller == _txContext_caller, "PW: Mismatch in purchase context");

        info.nftTokenId = tokenId;
        info.nftCollection = msg.sender; // Record the actual collection address

        IERC721(msg.sender).transferFrom(address(this), _txContext_caller, tokenId);

        emit NftReceivedAndForwarded(_txContext_localTokenId, msg.sender, tokenId, _txContext_caller);

        // It's good practice to clear context variables if they are not needed anymore,
        // though their values will be overwritten by the next confirmPurchase call.
        // For this pattern, they are effectively cleared/reset at the start of confirmPurchase.

        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @notice Recovers SAND tokens (or other ERC20 specified in `sandToken`)
     *         that were accidentally sent or accumulated in this contract.
     * @dev Only callable by the contract owner.
     * @param recipient Address to receive the recovered ERC20 tokens.
     */
    function recoverSand(address recipient) external onlyOwner {
        require(recipient != address(0), "PW: Invalid recipient address for SAND recovery");
        uint256 balance = sandToken.balanceOf(address(this));
        require(balance > 0, "PW: No SAND tokens to recover");

        SafeERC20.safeTransfer(sandToken, recipient, balance);
    }

    /**
     * @notice Recovers an NFT that is stuck in this contract.
     * @dev Only callable by the contract owner. This is for NFTs that were not processed
     *      through the standard purchase flow or whose automated transfer failed.
     * @param nftCollectionAddress Address of the NFT collection contract.
     * @param tokenId The ID of the NFT to recover.
     * @param recipient Address to receive the recovered NFT.
     */
    function recoverNft(address nftCollectionAddress, uint256 tokenId, address recipient) external onlyOwner {
        require(nftCollectionAddress != address(0), "PW: Invalid NFT collection address for recovery");
        // Token ID 0 can be valid for some ERC721 contracts.
        // Consider checking ownerOf(tokenId) == address(this) if a more robust check is needed.
        require(recipient != address(0), "PW: Invalid recipient address for NFT recovery");

        IERC721(nftCollectionAddress).transferFrom(address(this), recipient, tokenId);
    }

    /**
     * @notice Transfers an NFT associated with a `localTokenId` from its original recipient
     *         (who received it after a purchase via this wrapper) to a new address.
     * @dev This function acts as a convenience for the NFT owner (`from` address, who must be
     *      the `originalSender` for the `localTokenId`) to transfer the NFT they own.
     *      The `msg.sender` must be the `from` address.
     * @param from The current owner of the NFT (must be the original recipient of the purchase).
     * @param to The new address to receive the NFT.
     * @param localTokenId The local temporary token ID that was used during the `confirmPurchase` call,
     *                     which now maps to the actual minted NFT.
     */
    function transferFrom(address from, address to, uint256 localTokenId) external {
        require(to != address(0), "PW: Transfer to the zero address");
        PurchaseInfo storage info = _purchaseInfo[localTokenId];

        require(info.caller != address(0), "PW: Invalid local token ID or purchase not completed");
        require(info.nftTokenId != 0, "PW: NFT not yet minted or recorded for this local token ID");
        require(info.nftCollection != address(0), "PW: NFT collection not recorded for this local token ID");
        require(from == info.caller, "PW: 'from' address is not the original recipient of the NFT");
        require(msg.sender == from, "PW: Caller must be the 'from' address (the NFT owner)");

        IERC721(info.nftCollection).transferFrom(from, to, info.nftTokenId);
        emit NftTransferredViaWrapper(localTokenId, from, to, info.nftTokenId);
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
        require(to != address(0), "PW: Safe transfer to the zero address");
        PurchaseInfo storage info = _purchaseInfo[localTokenId];

        require(info.caller != address(0), "PW: Invalid local token ID or purchase not completed");
        require(info.nftTokenId != 0, "PW: NFT not yet minted or recorded for this local token ID");
        require(info.nftCollection != address(0), "PW: NFT collection not recorded for this local token ID");
        require(from == info.caller, "PW: 'from' address is not the original recipient of the NFT");
        require(msg.sender == from, "PW: Caller must be the 'from' address (the NFT owner)");

        IERC721(info.nftCollection).safeTransferFrom(from, to, info.nftTokenId);
        emit NftTransferredViaWrapper(localTokenId, from, to, info.nftTokenId);
    }

    /**
     * @notice Safely transfers an NFT associated with a `localTokenId` using `safeTransferFrom` with data.
     * @dev Similar to `safeTransferFrom` but includes a `data` parameter.
     *      The `msg.sender` must be the `from` address.
     * @param from The current owner of the NFT.
     * @param to The new address to receive the NFT.
     * @param localTokenId The local temporary token ID.
     * @param data Additional data with no specified format to accompany the transfer.
     */
    function safeTransferFrom(address from, address to, uint256 localTokenId, bytes calldata data) external {
        require(to != address(0), "PW: Safe transfer with data to the zero address");
        PurchaseInfo storage info = _purchaseInfo[localTokenId];

        require(info.caller != address(0), "PW: Invalid local token ID or purchase not completed");
        require(info.nftTokenId != 0, "PW: NFT not yet minted or recorded for this local token ID");
        require(info.nftCollection != address(0), "PW: NFT collection not recorded for this local token ID");
        require(from == info.caller, "PW: 'from' address is not the original recipient of the NFT");
        require(msg.sender == from, "PW: Caller must be the 'from' address (the NFT owner)");

        IERC721(info.nftCollection).safeTransferFrom(from, to, info.nftTokenId, data);
        emit NftTransferredViaWrapper(localTokenId, from, to, info.nftTokenId);
    }
}
