// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IERC20Approve {
    function approve(address spender, uint256 amount) external returns (bool);

    function increaseAllowance(address spender, uint256 amount) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}
