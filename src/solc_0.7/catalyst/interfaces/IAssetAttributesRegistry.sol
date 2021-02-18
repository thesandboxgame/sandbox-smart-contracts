//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

interface IAssetAttributesRegistry {
    function getRecord(uint256 assetId)
        external
        view
        returns (
            bool exists,
            uint16 catalystId,
            uint16[] memory gemIds
        );

    function getAttributes(uint256 assetId, GemEvent[] calldata events) external view returns (uint32[] memory values);
}
