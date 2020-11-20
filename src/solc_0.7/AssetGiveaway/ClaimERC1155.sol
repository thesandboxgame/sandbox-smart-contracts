//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../common/Interfaces/AssetToken.sol";

contract ClaimERC1155 {
    using SafeMath for uint256;

    bytes32 internal immutable _merkleRoot;

    AssetToken _asset;
    event ClaimedAssets(address to, uint256[] assetIds, uint256[] assetValues);

    constructor(AssetToken asset, bytes32 merkleRoot) {
        _asset = asset;
        _merkleRoot = merkleRoot;
    }

    function _claimERC1155(
        address from,
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata assetValues,
        bytes32[] calldata proof
    ) internal {
        _checkValidity(from, assetIds, assetValues, proof);
        _sendAssets(to, assetIds, assetValues);
        emit ClaimedAssets(to, assetIds, assetValues);
    }

    function _checkValidity(
        address from,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        bytes32[] memory proof
    ) internal view {
        // TODO:
        // check length assetIds is the same as assetValues
        // check contract actually holds these assets(?)
        bytes32 leaf = _generateClaimHash(from, assetIds, assetValues, proof);
        require(_verify(proof, leaf), "INVALID_CLAIM");
    }

    function _generateClaimHash(
        address from,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        bytes32[] memory proof
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(from, assetIds, assetValues, proof));
    }

    // TODO: review
    function _verify(bytes32[] memory proof, bytes32 leaf) internal view returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _merkleRoot;
    }

    function _sendAssets(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues
    ) internal returns (bool) {
        _asset.safeBatchTransferFrom(address(this), to, assetIds, assetValues, "");
    }
}
