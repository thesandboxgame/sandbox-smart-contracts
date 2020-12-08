//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../common/BaseWithStorage/ERC721BaseToken.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./ClaimERC721.sol";
import "../common/BaseWithStorage/WithAdmin.sol";

/// @title LandGiveaway contract
/// @notice This contract manages ERC721claims
contract LandGiveaway is WithAdmin, ClaimERC721 {
    bytes4 internal constant ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant ERC721_BATCH_RECEIVED = 0x4b808c46;
    uint256 internal immutable _expiryTime;
    mapping(address => bool) public claimed;

    constructor(
        address land,
        address admin,
        bytes32 merkleRoot,
        address landHolder,
        uint256 expiryTime
    ) ClaimERC721(ERC721BaseToken(land), landHolder) {
        _admin = admin;
        _merkleRoot = merkleRoot;
        _expiryTime = expiryTime;
    }

    /// @notice Function to set the merkle root hash for the land data, if it is 0
    /// @param merkleRoot the merkle root hash of the asset data
    function setMerkleRoot(bytes32 merkleRoot) external onlyAdmin {
        require(_merkleRoot == 0, "MERKLE_ROOT_ALREADY_SET");
        _merkleRoot = merkleRoot;
    }

    /// @notice Function to permit the claiming of an asset to a reserved address
    /// @param to the intended recipient (reserved address) of the ERC721 tokens
    /// @param ids the array of IDs of the LAND tokens
    /// @param proof the proof submitted for verification
    /// @param salt the salt submitted for verification
    function claimLands(
        address to,
        uint256[] calldata ids,
        bytes32[] calldata proof,
        bytes32 salt
    ) external {
        require(block.timestamp < _expiryTime, "CLAIM_PERIOD_IS_OVER");
        require(to != address(0), "INVALID_TO_ZERO_ADDRESS");
        require(claimed[to] == false, "DESTINATION_ALREADY_CLAIMED");
        claimed[to] = true;
        _claimERC721(to, ids, proof, salt);
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
}
