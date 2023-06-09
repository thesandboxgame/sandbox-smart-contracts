// SPDX-License-Identifier: MIT
/* solhint-disable no-empty-blocks */
pragma solidity ^0.8;

import {ERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract FakeMintableERC20 is ERC20Upgradeable {
    constructor() initializer {
        super.__ERC20_init("MINE", "MINE");
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
