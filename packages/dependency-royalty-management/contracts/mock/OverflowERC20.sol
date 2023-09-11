// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.0;

contract OverflowTestERC20 {
    uint256 constant MAX_BALANCE = 115792089237316195423570985008687907853269984665640564039457584007913129639935;
    mapping(address => uint256) private balances;

    function mintMax(address account) external {
        balances[account] = MAX_BALANCE;
    }

    function balanceOf(address _account) external view returns (uint256) {
        return balances[_account];
    }
}
