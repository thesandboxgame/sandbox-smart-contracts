//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {Context} from "@openzeppelin/contracts-0.8/utils/Context.sol";
import {ClaimERC1155ERC721ERC20} from "./ClaimERC1155ERC721ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts-0.8/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts-0.8/security/Pausable.sol";
import {ERC2771Handler} from "../../common/BaseWithStorage/ERC2771Handler.sol";

/// @title A Multi Claim contract that enables claims of user rewards in the form of ERC1155, ERC721 and / or ERC20 tokens
/// @notice This contract manages claims for multiple token types
/// @dev The contract implements ERC2771 to ensure that users do not pay gas
contract MultiGiveaway is AccessControl, ClaimERC1155ERC721ERC20, ERC2771Handler, Pausable {
    bytes4 private constant ERC1155_RECEIVED = 0xf23a6e61;
    bytes4 private constant ERC1155_BATCH_RECEIVED = 0xbc197c81;
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;

    mapping(address => mapping(bytes32 => bool)) public claimed;
    mapping(bytes32 => uint256) internal _expiryTime;

    event NewGiveaway(bytes32 merkleRoot, uint256 expiryTime);
    event NewTrustedForwarder(address trustedForwarder);

    constructor(address admin, address trustedForwarder) {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        __ERC2771Handler_initialize(trustedForwarder);
    }

    /// @notice Function to add a new giveaway.
    /// @param merkleRoot The merkle root hash of the claim data.
    /// @param expiryTime The expiry time for the giveaway.
    function addNewGiveaway(bytes32 merkleRoot, uint256 expiryTime)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        whenNotPaused()
    {
        _expiryTime[merkleRoot] = expiryTime;
        emit NewGiveaway(merkleRoot, expiryTime);
    }

    /// @notice set the trusted forwarder
    /// @param trustedForwarder address of the contract that is enabled to send meta-tx on behalf of the user
    function setTrustedForwarder(address trustedForwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _trustedForwarder = trustedForwarder;

        emit NewTrustedForwarder(trustedForwarder);
    }

    /// @notice Function to permit the claiming of multiple tokens from multiple giveaways to a reserved address.
    /// @param claims The array of claim structs, each containing a destination address, the giveaway items to be claimed and an optional salt param.
    /// @param proofs The proofs submitted for verification.
    function claimMultipleTokensFromMultipleMerkleTree(
        bytes32[] calldata rootHashes,
        Claim[] memory claims,
        bytes32[][] calldata proofs
    ) external {
        require(claims.length == rootHashes.length, "MULTIGIVEAWAY_INVALID_INPUT");
        require(claims.length == proofs.length, "MULTIGIVEAWAY_INVALID_INPUT");
        for (uint256 i = 0; i < rootHashes.length; i++) {
            claimMultipleTokens(rootHashes[i], claims[i], proofs[i]);
        }
    }

    /// @notice Function to check which giveaways have been claimed by a particular user.
    /// @param user The user (intended token destination) address.
    /// @param claims The claim struct containing the destination address, all items to be claimed and optional salt param.
    /// @return claimedGiveaways The array of bools confirming whether or not the giveaways relating to the root hashes provided have been claimed.
    function getClaimedStatus(address user, Claim[] memory claims) external view returns (bool[] memory) {
        bool[] memory claimedGiveaways = new bool[](claims.length);
        for (uint256 i = 0; i < claims.length; i++) {
            bytes32 merkleLeaf = _generateClaimHash(claims[i]);
            claimedGiveaways[i] = claimed[user][merkleLeaf];
        }
        return claimedGiveaways;
    }

    /// @dev Public function used to perform validity checks and progress to claim multiple token types in one claim.
    /// @param merkleRoot The merkle root hash for the specific set of items being claimed.
    /// @param claim The claim struct containing the destination address, all items to be claimed and optional salt param.
    /// @param proof The proof provided by the user performing the claim function.
    function claimMultipleTokens(
        bytes32 merkleRoot,
        Claim memory claim,
        bytes32[] calldata proof
    ) public whenNotPaused() {
        uint256 giveawayExpiryTime = _expiryTime[merkleRoot];
        require(claim.to != address(0), "MULTIGIVEAWAY_INVALID_TO_ZERO_ADDRESS");
        require(claim.to != address(this), "MULTIGIVEAWAY_DESTINATION_MULTIGIVEAWAY_CONTRACT");
        require(giveawayExpiryTime != 0, "MULTIGIVEAWAY_DOES_NOT_EXIST");
        require(block.timestamp < giveawayExpiryTime, "MULTIGIVEAWAY_CLAIM_PERIOD_IS_OVER");
        bytes32 merkleLeaf = _generateClaimHash(claim);
        require(claimed[claim.to][merkleLeaf] == false, "MULTIGIVEAWAY_DESTINATION_ALREADY_CLAIMED");
        claimed[claim.to][merkleLeaf] = true;

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

    function _msgSender() internal view override(Context, ERC2771Handler) returns (address sender) {
        return ERC2771Handler._msgSender();
    }

    function _msgData() internal view override(Context, ERC2771Handler) returns (bytes calldata) {
        return ERC2771Handler._msgData();
    }
}
