//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../common/Interfaces/IERC721Extended.sol";

contract ClaimERC721AndERC1155WithERC20 {
    bytes32 internal _merkleRoot;
    IERC1155 internal immutable _asset;
    IERC20 internal immutable _erc20Token;
    IERC721Extended internal immutable _land;
    address internal immutable _assetsHolder;
    address internal immutable _landHolder;
    address internal immutable _erc20TokenHolder;
    event ClaimedAssetsAndLandsWithERC20(
        address to,
        uint256[] assetIds,
        uint256[] assetValues,
        uint256[] landIds,
        uint256 erc20TokenAmount
    );

    constructor(
        IERC1155 asset,
        IERC721Extended land,
        IERC20 erc20Token,
        address assetsHolder,
        address landHolder,
        address erc20TokenHolder
    ) {
        _asset = asset;
        _land = land;
        _erc20Token = erc20Token;
        if (assetsHolder == address(0)) {
            assetsHolder = address(this);
        }
        if (landHolder == address(0)) {
            landHolder = address(this);
        }
        if (erc20TokenHolder == address(0)) {
            erc20TokenHolder = address(this);
        }
        _assetsHolder = assetsHolder;
        _landHolder = landHolder;
        _erc20TokenHolder = erc20TokenHolder;
    }

    /// @dev See for example MultiGiveawayWithERC20.sol claimAssetsAndLandsWithERC20.
    function _claimERC721AndERC1155WithERC20(
        address to,
        uint256[] calldata assetIds,
        uint256[] calldata assetValues,
        uint256[] calldata landIds,
        uint256 erc20Amount,
        bytes32[] calldata proof,
        bytes32 salt
    ) internal {
        _checkValidity(to, assetIds, assetValues, landIds, erc20Amount, proof, salt);
        _sendAssets(to, assetIds, assetValues);
        _sendLands(to, landIds);
        _transferERC20(to, erc20Amount);
        emit ClaimedAssetsAndLandsWithERC20(to, assetIds, assetValues, landIds, erc20Amount);
    }

    function _checkValidity(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        uint256[] memory landIds,
        uint256 erc20Amount,
        bytes32[] memory proof,
        bytes32 salt
    ) private view {
        require(assetIds.length == assetValues.length, "INVALID_INPUT");
        bytes32 leaf = _generateClaimHash(to, assetIds, assetValues, landIds, erc20Amount, salt);
        require(_verify(proof, leaf), "INVALID_CLAIM");
    }

    function _generateClaimHash(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues,
        uint256[] memory landIds,
        uint256 erc20Amount,
        bytes32 salt
    ) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(to, assetIds, assetValues, landIds, erc20Amount, salt));
    }

    function _verify(bytes32[] memory proof, bytes32 leaf) private view returns (bool) {
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
    ) private {
        _asset.safeBatchTransferFrom(_assetsHolder, to, assetIds, assetValues, "");
    }

    function _sendLands(address to, uint256[] memory ids) private {
        _land.safeBatchTransferFrom(_landHolder, to, ids, "");
    }

    function _transferERC20(address to, uint256 erc20Amount) private {
        require(_erc20Token.transferFrom(_erc20TokenHolder, to, erc20Amount), "ERC20_TRANSFER_FAILED");
    }
}
