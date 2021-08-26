pragma solidity 0.8.2;

interface LandToken {
    function mintQuad(
        address to,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes calldata data
    ) external;
}
