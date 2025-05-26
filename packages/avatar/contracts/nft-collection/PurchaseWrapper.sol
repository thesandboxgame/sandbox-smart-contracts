// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {INFTCollection} from "./INFTCollection.sol";
import "hardhat/console.sol";

/**
 * @title PurchaseWrapper
 * @author The Sandbox
 * @notice Contract that facilitates NFT purchases through ERC20 tokens
 * @dev Implements a fake ERC721 interface and acts as an intermediary for NFT purchases
 */
contract PurchaseWrapper is Ownable, IERC721Receiver {
    // NFT Collection contract reference
    INFTCollection public nftCollection;

    // Sand token contract reference
    IERC20 public sandToken;

    // Current recipient for the minted NFT
    address private _currentRecipient;

    // Flag to track if a mint is in progress
    bool private _mintInProgress;

    /**
     * @notice Constructor to set initial configuration
     * @param _nftCollection Address of the NFT Collection contract
     * @param _sandToken Address of the Sand token contract
     */
    constructor(address _nftCollection, address _sandToken) Ownable(msg.sender) {
        nftCollection = INFTCollection(_nftCollection);
        sandToken = IERC20(_sandToken);
    }

    /**
     * @notice Updates the NFT Collection contract address
     * @param _nftCollection Address of the new NFT Collection contract
     */
    function setNFTCollection(address _nftCollection) external onlyOwner {
        nftCollection = INFTCollection(_nftCollection);
    }

    /**
     * @notice Updates the Sand token contract address
     * @param _sandToken Address of the new Sand token contract
     */
    function setSandToken(address _sandToken) external onlyOwner {
        sandToken = IERC20(_sandToken);
    }

    /**
     * @notice Handles the purchase confirmation and initiates the NFT minting
     * @param sender The original sender of the approveAndCall transaction
     * @param amount The amount of tokens approved for the purchase
     * @param wallet The wallet to receive the NFT
     * @param waveIndex The wave index for minting
     * @param tokenAmount The number of tokens to mint
     * @param signatureId The signature ID for verification
     * @param signature The signature data for verification
     * @return The result of the NFT minting operation
     */
    function confirmPurchase(
        address sender,
        uint256 amount,
        address wallet,
        uint256 waveIndex,
        uint256 tokenAmount,
        uint256 signatureId,
        bytes calldata signature
    ) external payable returns (bytes memory) {
        // Ensure no other mint is in progress
        require(!_mintInProgress, "Another mint is in progress");
        require(wallet != address(0), "Invalid recipient address");

        // Set the current recipient for this transaction
        _currentRecipient = wallet;
        _mintInProgress = true;

        // transfer sand tokens from sender to this contract
        sandToken.transferFrom(sender, address(this), amount);

        // Ensure the sender has enough Sand tokens
        require(sandToken.balanceOf(address(this)) >= amount, "Insufficient Sand tokens");

        // Prepare the data for calling waveMint on the NFT Collection
        // Function selector for waveMint(address,uint256,uint256,uint256,bytes)
        bytes4 waveMintSelector = bytes4(keccak256("waveMint(address,uint256,uint256,uint256,bytes)"));

        bytes memory data = abi.encodeWithSelector(
            waveMintSelector,
            address(this), // Tokens will be minted to this contract first
            tokenAmount,
            waveIndex,
            signatureId,
            signature
        );

        // Call approveAndCall on the payment token to initiate the mint
        (bool success, bytes memory returnData) = address(sandToken).call(
            abi.encodeWithSelector(
                // Selector for approveAndCall(address,uint256,bytes)
                bytes4(keccak256("approveAndCall(address,uint256,bytes)")),
                address(nftCollection),
                amount,
                data
            )
        );

        if (!success) {
            // Reset state if mint fails
            _mintInProgress = false;
            _currentRecipient = address(0);
            revert("NFT purchase failed");
        }

        return returnData;
    }

    /**
     * @notice Handles the receipt of an ERC721 token
     * @dev Forwards the received token to the intended recipient
     * @param operator The address which called the `safeTransferFrom` function
     * @param from The address which previously owned the token
     * @param tokenId The ID of the token being transferred
     * @param data Additional data with no specified format
     * @return bytes4 `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        // Ensure a mint is in progress and we have a valid recipient
        require(_mintInProgress, "No mint in progress");
        require(_currentRecipient != address(0), "No recipient specified");

        // Store recipient locally before resetting state
        address recipient = _currentRecipient;

        // Reset state before external calls to prevent reentrancy issues
        _mintInProgress = false;
        _currentRecipient = address(0);

        // Forward the token to the end recipient using transferFrom to avoid nested callbacks
        IERC721(msg.sender).transferFrom(address(this), recipient, tokenId);

        // Return the ERC721 receiver selector
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @notice Fake ERC721 transfer implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    function transferFrom(address from, address to, uint256 tokenId) external {
        // Intentionally empty - fake implementation
    }

    /**
     * @notice Fake ERC721 safe transfer implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        // Intentionally empty - fake implementation
    }

    /**
     * @notice Fake ERC721 safe transfer with data implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        // Intentionally empty - fake implementation
    }

    /**
     * @notice Fake ERC721 approval implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    function approve(address to, uint256 tokenId) external {
        // Intentionally empty - fake implementation
    }

    /**
     * @notice Fake ERC721 setApprovalForAll implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    function setApprovalForAll(address operator, bool approved) external {
        // Intentionally empty - fake implementation
    }

    /**
     * @notice Fake ERC721 balanceOf implementation
     * @dev Required for interface compatibility
     */
    function balanceOf(address owner) external view returns (uint256) {
        return 0; // Always return 0 as this is not a real ERC721
    }

    /**
     * @notice Fake ERC721 ownerOf implementation
     * @dev Required for interface compatibility
     */
    function ownerOf(uint256 tokenId) external view returns (address) {
        return address(0); // Always return zero address as this is not a real ERC721
    }

    /**
     * @notice Fake ERC721 getApproved implementation
     * @dev Required for interface compatibility
     */
    function getApproved(uint256 tokenId) external view returns (address) {
        return address(0); // Always return zero address as this is not a real ERC721
    }

    /**
     * @notice Fake ERC721 isApprovedForAll implementation
     * @dev Required for interface compatibility
     */
    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return false; // Always return false as this is not a real ERC721
    }

    /**
     * @notice Emergency function to reset mint state if stuck
     * @dev Only callable by owner
     */
    function resetMintState() external onlyOwner {
        _mintInProgress = false;
        _currentRecipient = address(0);
    }
}
