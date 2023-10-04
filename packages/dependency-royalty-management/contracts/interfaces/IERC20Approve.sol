// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

///@title IERC20Approve
///@notice Interface for ERC20 token approval operations
interface IERC20Approve {
    ///@notice Approves the specified spender to spend up to the given amount of tokens on behalf of the sender
    ///@param spender The address that is allowed to spend tokens
    ///@param amount The maximum amount of tokens that the spender is allowed to spend
    ///@return `true` if the approval was successful, otherwise `false`
    function approve(address spender, uint256 amount) external returns (bool);

    ///@notice Increases the allowance granted to the specified spender by the given amount
    ///@param spender The address that is allowed to spend tokens
    ///@param amount The additional amount of tokens that the spender is allowed to spend
    ///@return `true` if the increase in allowance was successful, otherwise `false`
    function increaseAllowance(address spender, uint256 amount) external returns (bool);
}
