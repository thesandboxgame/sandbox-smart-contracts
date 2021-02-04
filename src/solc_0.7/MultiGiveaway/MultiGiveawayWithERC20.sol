//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./ClaimMultipleTokens.sol";
import "../common/BaseWithStorage/WithAdmin.sol";

/// @title MultiGiveaway contract.
/// @notice This contract manages claims.
contract MultiGiveawayWithERC20 is WithAdmin, ClaimMultipleTokens {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;

    mapping(address => mapping(bytes32 => bool)) public claimed; // TODO: change to uniswap version
    mapping(bytes32 => uint256) internal _expiryTime;

    constructor(
        address admin,
        bytes32 merkleRoot,
        uint256 expiryTime
    ) {
        _admin = admin;
        _merkleRoot = merkleRoot;
        _expiryTime[_merkleRoot] = expiryTime; // TODO: can only do this if have a non-zero initial merkleRoot
    }

    /// @notice Function to set the merkle root hash for the claim data.
    /// @param merkleRoot The merkle root hash of the claim data.
    function setMerkleRoot(bytes32 merkleRoot) external onlyAdmin {
        _merkleRoot = merkleRoot; // TODO: discuss how to implement concurrent claims. Change to addNewGiveaway function?
    }

    /// @notice Function to permit the claiming of multiple tokens to a reserved address.
    /// @param claim The claim.
    /// @param proof The proof submitted for verification.
    function claimMultipleTokens(
        Claim memory claim, // Note: if calldata, get UnimplementedFeatureError; possibly fixed in solc 0.7.6
        bytes32[] calldata proof
    ) external {
        // require(block.timestamp < _expiryTime[_merkleRoot], "CLAIM_PERIOD_IS_OVER"); TODO: fix
        require(claim.to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(claimed[claim.to][_merkleRoot] == false, "DESTINATION_ALREADY_CLAIMED");
        claimed[claim.to][_merkleRoot] = true;
        _claimMultipleTokens(claim, proof);
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
