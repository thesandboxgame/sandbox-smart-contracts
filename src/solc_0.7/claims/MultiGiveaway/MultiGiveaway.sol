//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./ClaimERC1155ERC721ERC20.sol";
import "../../common/BaseWithStorage/WithAdmin.sol";

/// @title MultiGiveaway contract.
/// @notice This contract manages claims for multiple token types.
contract MultiGiveaway is WithAdmin, ClaimERC1155ERC721ERC20 {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;

    mapping(address => mapping(bytes32 => bool)) public claimed;
    mapping(bytes32 => uint256) internal _expiryTime;

    event NewGiveaway(bytes32 merkleRoot, uint256 expiryTime);

    constructor(address admin) {
        _admin = admin;
    }

    /// @notice Function to set the merkle root hash for the claim data.
    /// @param merkleRoot The merkle root hash of the claim data.
    /// @param expiryTime The expiry time for the giveaway.
    function addNewGiveaway(bytes32 merkleRoot, uint256 expiryTime) external onlyAdmin {
        _expiryTime[merkleRoot] = expiryTime;
        emit NewGiveaway(merkleRoot, expiryTime);
    }

    /// @notice Function to check which giveaways have been claimed by a particular user.
    /// @param user The user (destination) address.
    /// @param rootHashes The array of giveaway root hashes to check.
    function getClaimedStatus(address user, bytes32[] calldata rootHashes) external returns (bool[] memory) {
        bool[] memory claimedGiveaways = new bool[](rootHashes.length);
        for (uint256 i = 0; i < rootHashes.length; i++) {
            claimedGiveaways[i] = claimed[user][rootHashes[i]];
        }
        return claimedGiveaways;
    }

    /// @notice Function to permit the claiming of multiple tokens from multiple giveaways to a reserved address.
    /// @param claims The claims.
    /// @param proofs The proofs submitted for verification.
    function claimMultipleTokensFromMultipleMerkleTree(
        bytes32[] calldata rootHashes,
        Claim[] memory claims,
        bytes32[][] calldata proofs
    ) external {
        for (uint256 i = 0; i < rootHashes.length; i++) {
            _claimMultipleTokens(rootHashes[i], claims[i], proofs[i]);
        }
    }

    function _claimMultipleTokens(
        bytes32 merkleRoot,
        Claim memory claim, // Note: if calldata, get UnimplementedFeatureError; possibly fixed in solc 0.7.6
        bytes32[] calldata proof
    ) private {
        uint256 giveawayExpiryTime = _expiryTime[merkleRoot];
        require(claim.to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(claim.to != address(this), "DESTINATION_MULTIGIVEAWAY_CONTRACT");
        require(giveawayExpiryTime != 0, "GIVEAWAY_DOES_NOT_EXIST");
        require(block.timestamp < giveawayExpiryTime, "CLAIM_PERIOD_IS_OVER");
        require(claimed[claim.to][merkleRoot] == false, "DESTINATION_ALREADY_CLAIMED");
        claimed[claim.to][merkleRoot] = true;
        _claimERC1155ERC721ERC20(merkleRoot, claim, proof);
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
