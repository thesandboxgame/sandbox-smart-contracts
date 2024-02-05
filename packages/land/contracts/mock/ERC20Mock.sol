// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract ERC20Mock is ERC20Upgradeable {
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
