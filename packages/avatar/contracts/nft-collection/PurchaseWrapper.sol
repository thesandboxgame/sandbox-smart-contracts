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
 * @notice Contract that facilitates NFT purchases through ERC20 tokens
 * @custom:security-contact contact-blockchain@sandbox.game
 * @dev Implements a fake ERC721 interface and acts as an intermediary for NFT purchases
 */
contract PurchaseWrapper is Ownable, IERC721Receiver {
    // Sand token contract reference
    IERC20 public sandToken;

    // Current recipient for the minted NFT
    address private _currentRecipient;

    // Expected NFT collection address for the current mint
    address private _expectedCollection;

    /**
     * @notice Constructor to set initial configuration
     * @param _sandToken Address of the Sand token contract
     */
    constructor(address _sandToken) Ownable(msg.sender) {
        sandToken = IERC20(_sandToken);
    }

    /**
     * @notice Handles the purchase confirmation and initiates the NFT minting
     * @param sender The original sender of the approveAndCall transaction
     * @param nftCollection Address of the NFT Collection contract
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
        address nftCollection,
        uint256 amount,
        address wallet,
        uint256 waveIndex,
        uint256 tokenAmount,
        uint256 signatureId,
        bytes calldata signature
    ) external returns (bytes memory) {
        require(_currentRecipient == address(0), "Another mint is in progress");
        require(wallet != address(0), "Invalid recipient address");
        _currentRecipient = wallet;
        _expectedCollection = nftCollection;

        // Transfer sand tokens from sender to this contract
        SafeERC20.safeTransferFrom(sandToken, sender, address(this), amount);

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
            // Reset state if mint fails
            _currentRecipient = address(0);
            _expectedCollection = address(0);
            SafeERC20.safeTransfer(sandToken, sender, amount); // refund
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
        // solhint-disable-next-line no-unused-vars
        address operator,
        // solhint-disable-next-line no-unused-vars
        address from,
        uint256 tokenId,
        // solhint-disable-next-line no-unused-vars
        bytes calldata data
    ) external override returns (bytes4) {
        require(_currentRecipient != address(0), "No mint in progress");
        require(msg.sender == _expectedCollection, "Unexpected collection");

        address recipient = _currentRecipient;
        _currentRecipient = address(0);
        _expectedCollection = address(0);

        // Forward the token to the end recipient using transferFrom to avoid nested callbacks
        IERC721(msg.sender).transferFrom(address(this), recipient, tokenId);

        // Return the ERC721 receiver selector
        return IERC721Receiver.onERC721Received.selector;
    }

    /**
     * @notice Emergency function to reset mint state if stuck
     * @dev Only callable by owner
     */
    function resetMintState() external onlyOwner {
        _currentRecipient = address(0);
        _expectedCollection = address(0);
    }

    /**
     * @notice Recovers SAND tokens accidentally deposited to the contract
     * @dev Only callable by owner. Transfers all SAND balance to the specified recipient
     * @param recipient Address to receive the recovered SAND tokens
     */
    function recoverSand(address recipient) external onlyOwner {
        require(recipient != address(0), "Invalid recipient address");
        uint256 balance = sandToken.balanceOf(address(this));
        require(balance > 0, "No SAND tokens to recover");

        SafeERC20.safeTransfer(sandToken, recipient, balance);
    }

    /**
     * @notice Fake ERC721 transfer implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    // solhint-disable-next-line no-empty-blocks
    function transferFrom(address from, address to, uint256 tokenId) external {
        // Intentionally empty - fake implementation
    }

    /**
     * @notice Fake ERC721 safe transfer implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    // solhint-disable-next-line no-empty-blocks
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        // Intentionally empty - fake implementation
    }

    /**
     * @notice Fake ERC721 safe transfer with data implementation that does nothing
     * @dev Required for interface compatibility, but no actual functionality
     */
    // solhint-disable-next-line no-empty-blocks
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {
        // Intentionally empty - fake implementation
    }
}
