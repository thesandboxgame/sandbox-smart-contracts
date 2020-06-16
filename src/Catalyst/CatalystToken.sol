pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;


interface CatalystToken {
    event CatalystApplied(uint256 indexed assetId, uint256 indexed catalystId, uint256 seed, uint256[] gemIds, uint64 blockNumber);
    event GemsAdded(uint256 indexed assetId, uint256 seed, uint256 startIndex, uint256[] gemIds, uint64 blockNumber);

    function getValue(
        uint256 catalystId,
        uint256 seed,
        uint32 gemId,
        bytes32 blockHash,
        uint256 slotIndex
    ) external view returns (uint32);

    function getValues(
        uint256 catalystId,
        uint256 seed,
        uint256 startIndex,
        uint32[] calldata gemIds,
        bytes32[] calldata blockHashes
    ) external view returns (uint32[] memory);

    function getMintData(uint256 catalystId)
        external
        view
        returns (
            uint16 maxGems,
            uint16 minQuantity,
            uint16 maxQuantity,
            uint256 sandFee
        );

    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external;

    function burnFrom(
        address from,
        uint256 id,
        uint256 amount
    ) external;
}
