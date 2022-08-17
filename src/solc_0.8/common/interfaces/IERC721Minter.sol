//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IERC721Minter {
    function mint(address to, uint256 id) external;

    function mint(
        address to,
        uint256 id,
        bytes calldata data
    ) external;
}
