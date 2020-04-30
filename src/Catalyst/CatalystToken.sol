pragma solidity 0.6.5;


interface CatalystToken {
    function getValue(uint256 catalystId, uint256 gemId, uint64 blockNumber) external view returns (uint32);
}
