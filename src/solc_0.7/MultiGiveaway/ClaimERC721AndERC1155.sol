//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "../common/Interfaces/IERC721Extended.sol";

contract ClaimERC721AndERC1155 {
    bytes32 internal _merkleRoot;
    IERC1155 internal immutable _asset;
    IERC721Extended internal immutable _land;
    address internal immutable _assetsHolder;
    address internal immutable _landHolder;
    event ClaimedAssetsAndLands(address to, uint256[] assetIds, uint256[] assetValues, uint256[] landIds);

    constructor(
        IERC1155 asset,
        IERC721Extended land,
        address assetsHolder,
        address landHolder
    ) {
        _asset = asset;
        _land = land;
        if (assetsHolder == address(0)) {
            assetsHolder = address(this);
        }
        if (landHolder == address(0)) {
            landHolder = address(this);
        }
        _assetsHolder = assetsHolder;
        _landHolder = landHolder;
    }

    function _claimERC721AndERC1155(
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata assetValues,
        uint256[] calldata landIds,
        bytes32[] calldata proof,
        bytes32 salt
    ) internal {
        _checkValidity(to, assetIds, assetValues, landIds, proof, salt);
        _sendAssets(to, assetIds, assetValues); // TODO: if assetIds and values > 0
        _sendLands(to, landIds); // TODO: if lands
        emit ClaimedAssetsAndLands(to, assetIds, assetValues, landIds);
    }

    function _checkValidity(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        uint256[] memory landIds,
        bytes32[] memory proof,
        bytes32 salt
    ) internal view {
        require(assetIds.length == assetValues.length, "INVALID_INPUT");
        bytes32 leaf = _generateClaimHash(to, assetIds, assetValues, landIds, salt);
        require(_verify(proof, leaf), "INVALID_CLAIM");
    }

    function _generateClaimHash(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        uint256[] memory landIds,
        bytes32 salt
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, assetIds, assetValues, landIds, salt));
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

    function _sendAssets(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues
    ) internal {
        _asset.safeBatchTransferFrom(_assetsHolder, to, assetIds, assetValues, "");
    }

    function _sendLands(address to, uint256[] memory ids) internal {
        _land.safeBatchTransferFrom(_landHolder, to, ids, "");
    }
}
