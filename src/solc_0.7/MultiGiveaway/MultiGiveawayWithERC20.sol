//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./ClaimERC721AndERC1155WithERC20.sol";
import "../common/BaseWithStorage/WithAdmin.sol";

/// @title MultiGiveaway contract.
/// @notice This contract manages multiple ERC721,ERC1155 and ERC20 claims.
contract MultiGiveawayWithERC20 is WithAdmin, ClaimERC721AndERC1155WithERC20 {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;
    uint256 internal immutable _expiryTime;
    mapping(address => bool) public claimed;

    constructor(
        address asset,
        address land,
        address erc20Token,
        address admin,
        bytes32 merkleRoot,
        address assetsHolder,
        address landHolder,
        address erc20TokenHolder,
        uint256 expiryTime
    )
        ClaimERC721AndERC1155WithERC20(
            IERC1155(asset),
            IERC721Extended(land),
            IERC20(erc20Token),
            assetsHolder,
            landHolder,
            erc20TokenHolder
        )
    {
        _admin = admin;
        _merkleRoot = merkleRoot;
        _expiryTime = expiryTime;
    }

    /// @notice Function to set the merkle root hash for the asset data, if it is 0.
    /// @param merkleRoot The merkle root hash of the asset data.
    function setMerkleRoot(bytes32 merkleRoot) external onlyAdmin {
        require(_merkleRoot == 0, "MERKLE_ROOT_ALREADY_SET");
        _merkleRoot = merkleRoot;
    }

    /// @notice Function to permit the claiming of an asset to a reserved address.
    /// @param to The intended recipient (reserved address) of the ERC1155 tokens.
    /// @param assetIds The array of IDs of the asset tokens.
    /// @param assetValues The amounts of each token ID to transfer.
    /// @param proof The proof submitted for verification.
    /// @param salt The salt submitted for verification.
    function claimAssetsAndLandsWithERC20(
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata assetValues,
        uint256[] calldata landIds,
        uint256 erc20Amount,
        bytes32[] calldata proof,
        bytes32 salt
    ) external {
        require(block.timestamp < _expiryTime, "CLAIM_PERIOD_IS_OVER");
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(claimed[to] == false, "DESTINATION_ALREADY_CLAIMED");
        claimed[to] = true;
        _claimERC721AndERC1155WithERC20(to, assetIds, assetValues, landIds, erc20Amount, proof, salt);
    }

    function onERC721Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC721_RECEIVED;
    }

    function onERC721BatchReceived(
        address, /*operator*/
        address, /*from*/
        uint256[] calldata, /*ids*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC721_BATCH_RECEIVED;
    }

    function onERC1155Received(
        address, /*operator*/
        address, /*from*/
        uint256, /*id*/
        uint256, /*value*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC1155_RECEIVED;
    }

    function onERC1155BatchReceived(
        address, /*operator*/
        address, /*from*/
        uint256[] calldata, /*ids*/
        uint256[] calldata, /*values*/
        bytes calldata /*data*/
    ) external pure returns (bytes4) {
        return ERC1155_BATCH_RECEIVED;
    }
}
