pragma solidity 0.6.4;

interface LandToken {
    function mintQuad(address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external;
}