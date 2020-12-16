//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../common/Interfaces/IERC721Extended.sol";

contract ClaimERC721 {
    bytes32 internal _merkleRootLand;
    IERC721Extended internal immutable _land;
    address internal immutable _landHolder;
    event ClaimedLands(address to, uint256[] ids);

    constructor(IERC721Extended land, address landHolder) {
        _land = land;
        if (landHolder == address(0)) {
            landHolder = address(this);
        }
        _landHolder = landHolder;
    }

    /// @dev See for example LandGiveaway.sol claimLands.
    function _claimERC721(
        address to,
        uint256[] calldata ids,
        bytes32[] calldata proof,
        bytes32 salt
    ) internal {
        _checkValidityERC721Claim(to, ids, proof, salt);
        _sendLands(to, ids);
        emit ClaimedLands(to, ids);
    }

    function _checkValidityERC721Claim(
        address to,
        uint256[] memory ids,
        bytes32[] memory proof,
        bytes32 salt
    ) internal view {
        bytes32 leaf = _generateClaimHash(to, ids, salt);
        require(_verifyMerkleRootLand(proof, leaf), "INVALID_CLAIM");
    }

    function _generateClaimHash(
        address to,
        uint256[] memory ids,
        bytes32 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, ids, salt));
    }

    function _verifyMerkleRootLand(bytes32[] memory proof, bytes32 leaf) internal view returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash < proofElement) {
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        return computedHash == _merkleRootLand;
    }

    function _sendLands(address to, uint256[] memory ids) internal {
        _land.safeBatchTransferFrom(_landHolder, to, ids, "");
    }
}
