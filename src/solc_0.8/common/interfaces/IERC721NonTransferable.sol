//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

interface IERC721NonTransferable {
    function mint(address to) external returns (uint256);

    function burn(uint256 id) external;

    function burnFrom(address owner, uint256 id) external;
}
