//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;
pragma experimental ABIEncoderV2;

interface IAssetAttributesRegistry {
    struct GemEvent {
        uint16[] gemIds;
        bytes32 blockHash;
    }

    function getRecord(uint256 assetId)
        external
        view
        virtual
        returns (
            bool exists,
            uint16 catalystId,
            uint16[] memory gemIds
        );

    function getAttributes(uint256 assetId, GemEvent[] calldata events)
        external
        view
        virtual
        returns (uint32[] memory values);

    function setCatalyst(
        uint256 assetId,
        uint16 catalystId,
        uint16[] calldata gemIds
    ) external virtual;

    function setCatalystWithBlockNumber(
        uint256 assetId,
        uint16 catalystId,
        uint16[] calldata gemIds,
        uint64 blockNumber
    ) external virtual;

    function addGems(uint256 assetId, uint16[] calldata gemIds) external virtual;

    function setMigrationContract(address _migrationContract) external virtual;
}
