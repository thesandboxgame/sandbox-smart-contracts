// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract NFTWithoutTransferCheck {
    // Mapping from token ID to account balances
    mapping(uint256 => mapping(address => uint256)) public _balances;

    // Mapping from account to operator approvals
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external {
        _balances[id][to] = amount;
    }

    function transfer(
        address from,
        address to,
        uint256 id,
        uint256 amount
    ) external {
        _balances[id][from] -= amount;
        _balances[id][to] += amount;
    }

    function balanceOf(address owner, uint256 id) external view returns (uint256 amount) {
        return _balances[id][owner];
    }
}
