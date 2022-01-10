//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ERC20} from "@openzeppelin/contracts-0.8/token/ERC20/ERC20.sol";

/// @dev This is NOT a secure ERC20
/// DO NOT USE in production.
contract ERC20Mintable is ERC20 {
    // solhint-disable-next-line no-empty-blocks
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
