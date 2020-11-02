pragma solidity 0.6.5;


interface GemToken {
    function batchBurnFrom(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external;
}
