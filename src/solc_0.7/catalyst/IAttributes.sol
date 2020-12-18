//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "./AssetAttributesRegistry.sol";

interface IAttributes {
    function getAttributes(uint256 assetId, AssetAttributesRegistry.GemEvent[] calldata events)
        external
        view
        returns (uint32[] memory values);
}
