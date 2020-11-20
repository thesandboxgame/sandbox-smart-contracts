//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "../common/Interfaces/AssetToken.sol";

contract ClaimERC1155 {
    using SafeMath for uint256;

    AssetToken _asset;
    event ClaimedAssets(address to, uint256[] assetIds, uint256[] assetValues);

    constructor(AssetToken asset) {
        _asset = asset;
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
    ) internal returns (bool) {
        // TODO:
        // check length assetIds is the same as assetValues
        // check contract holds the assetIds in these values
        // verify proof
        return true;
    }

    function _sendAssets(
        address to,
        uint256[] memory assetIds,
        uint256[] memory assetValues
    ) internal returns (bool) {
        _asset.safeBatchTransferFrom(address(this), to, assetIds, assetValues, "");
    }
}
