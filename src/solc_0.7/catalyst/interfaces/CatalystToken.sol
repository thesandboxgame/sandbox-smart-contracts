//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "../AssetAttributesRegistry.sol";

// TODO ERC20
interface CatalystToken {
    function getMaxGems() external view returns (uint8);

    function getAttributes(uint256 assetId, AssetAttributesRegistry.GemEvent[] calldata events)
        external
        view
        returns (uint32[] memory values);
}
