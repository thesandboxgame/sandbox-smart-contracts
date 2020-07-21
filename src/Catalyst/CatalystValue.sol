pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;


interface CatalystValue {
    function getValues(
        uint256 catalystId,
        uint256 seed,
        uint32[] calldata gemIds,
        bytes32[] calldata blockHashes
    ) external view returns (uint32[] memory);
}
