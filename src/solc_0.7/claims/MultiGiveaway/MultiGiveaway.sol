//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "./ClaimERC1155ERC721ERC20.sol";
import "../../common/BaseWithStorage/WithAdmin.sol";
import "../../Utils/Clones.sol";

interface Holder {
    function approve(
        IERC721[] calldata erc721s,
        IERC1155[] calldata erc1155s,
        IERC20[] calldata erc20s
    ) external;
}

/// @title MultiGiveaway contract.
/// @notice This contract manages claims for multiple token types.
contract MultiGiveaway is WithAdmin, ClaimERC1155ERC721ERC20 {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;

    struct MerkleRootInfo {
        uint96 expiryTime;
        address holder;
    }

    mapping(address => mapping(bytes32 => bool)) public claimed; // TODO: change to index mapping - see uniswap
    mapping(bytes32 => MerkleRootInfo) internal _merkleRoots;

    constructor(address admin) {
        _admin = admin;
    }

    /// @notice Function to set the merkle root hash for the claim data.
    /// @param merkleRoot The merkle root hash of the claim data.
    /// @param expiryTime The expiry time for the giveaway.
    function addNewGiveaway(bytes32 merkleRoot, uint96 expiryTime) external onlyAdmin {
        _merkleRoots[merkleRoot] = MerkleRootInfo(expiryTime, address(this));
        // TODO emit event
    }

    /// @notice Function to set the merkle root hash for the claim data.
    /// @param merkleRoot The merkle root hash of the claim data.
    /// @param expiryTime The expiry time for the giveaway.
    /// @param holderCodeAddress the contract to clone from
    /// @param erc721s list of erc721 to be approved by the holder (not that if one is missing the claim will not work)
    /// @param erc1155s list of erc1155 to be approved by the holder (not that if one is missing the claim will not work)
    /// @param erc20s list of erc20 to be approved by the holder (not that if one is missing the claim will not work)
    function addGiveawayWithSeparateHolder(
        bytes32 merkleRoot,
        uint96 expiryTime,
        address holderCodeAddress,
        IERC721[] calldata erc721s,
        IERC1155[] calldata erc1155s,
        IERC20[] calldata erc20s
    ) external onlyAdmin {
        address holder = Clones.cloneDeterministic(holderCodeAddress, merkleRoot);
        Holder(holder).approve(erc721s, erc1155s, erc20s);
        _merkleRoots[merkleRoot] = MerkleRootInfo(expiryTime, holder);
        // TODO emit event
    }

    /// @notice Function to check which giveaways have been claimed by a particular user.
    /// @param user The user (destination) address.
    /// @param rootHashes The array of giveaway root hashes to check.
    function getClaimedStatus(address user, bytes32[] calldata rootHashes) external view returns (bool[] memory) {
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
        require(claim.to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(claim.to != address(this), "DESTINATION_MULTIGIVEAWAY_CONTRACT");
        MerkleRootInfo memory info = _merkleRoots[merkleRoot];
        require(info.expiryTime != 0, "GIVEAWAY_DOES_NOT_EXIST");
        require(block.timestamp < info.expiryTime, "CLAIM_PERIOD_IS_OVER");
        require(claimed[claim.to][merkleRoot] == false, "DESTINATION_ALREADY_CLAIMED");
        claimed[claim.to][merkleRoot] = true;
        _claimERC1155ERC721ERC20(info.holder, merkleRoot, claim, proof);
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
