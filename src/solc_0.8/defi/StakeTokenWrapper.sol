//SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/utils/Context.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";

abstract contract StakeTokenWrapper is Context {
    using Address for address;
    using SafeERC20 for IERC20;
    IERC20 internal _stakeToken;

    uint256 internal _totalSupply;
    mapping(address => uint256) internal _balances;

    constructor(IERC20 stakeToken) {
        require(address(stakeToken).isContract(), "StakeTokenWrapper: is not a contract");
        _stakeToken = stakeToken;
    }

    function _stake(uint256 amount) internal virtual {
        require(amount > 0, "StakeTokenWrapper: amount > 0");
        _totalSupply = _totalSupply + amount;
        _balances[_msgSender()] = _balances[_msgSender()] + amount;
        _stakeToken.safeTransferFrom(_msgSender(), address(this), amount);
    }

    function _withdraw(uint256 amount) internal virtual {
        require(amount > 0, "StakeTokenWrapper: amount > 0");
        _totalSupply = _totalSupply - amount;
        _balances[_msgSender()] = _balances[_msgSender()] - amount;
        _stakeToken.safeTransfer(_msgSender(), amount);
    }

    uint256[50] private __gap;
}
