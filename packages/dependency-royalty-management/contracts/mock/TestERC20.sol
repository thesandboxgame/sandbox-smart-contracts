// SPDX-License-Identifier: MIT OR Apache-2.0
/* solhint-disable-next-line no-empty-blocks*/

pragma solidity ^0.8.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20 {
    /* solhint-disable-next-line no-empty-blocks*/
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }
}
