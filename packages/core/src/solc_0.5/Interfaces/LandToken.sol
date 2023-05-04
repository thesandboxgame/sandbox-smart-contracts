pragma solidity 0.5.9;

contract LandToken {
    function batchTransferQuad(
        address from,
        address to,
        uint256[] calldata sizes,
        uint256[] calldata xs,
        uint256[] calldata ys,
        bytes calldata data
    ) external;

    function transferQuad(address from, address to, uint256 size, uint256 x, uint256 y, bytes calldata data) external;

    function batchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) external;
}
