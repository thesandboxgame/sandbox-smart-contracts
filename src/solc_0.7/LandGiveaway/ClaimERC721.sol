//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "../common/BaseWithStorage/ERC721BaseToken.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ClaimERC721 {
    bytes32 internal _merkleRoot;
    ERC721BaseToken internal immutable _land;
    address internal immutable _landHolder;
    event ClaimedLands(address to, uint256[] ids);

    constructor(ERC721BaseToken land, address landHolder) {
        _land = land;
        if (landHolder == address(0)) {
            landHolder = address(this);
        }
        _landHolder = landHolder;
    }

    function _claimERC721(
        address to,
        uint256[] calldata ids,
        bytes32[] calldata proof,
        bytes32 salt
    ) internal {
        _checkValidity(to, ids, proof, salt);
        _sendAssets(to, ids);
        emit ClaimedLands(to, ids);
    }

    function _checkValidity(
        address to,
        uint256[] memory ids,
        bytes32[] memory proof,
        bytes32 salt
    ) internal view {
        bytes32 leaf = _generateClaimHash(to, ids, salt);
        require(_verify(proof, leaf), "INVALID_CLAIM");
    }

    function _generateClaimHash(
        address to,
        uint256[] memory ids,
        bytes32 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, ids, salt));
    }

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

    function _sendAssets(address to, uint256[] memory ids) internal {
        _land.safeBatchTransferFrom(_landHolder, to, ids, "");
    }
}
