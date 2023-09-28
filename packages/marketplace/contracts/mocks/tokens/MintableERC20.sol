// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MintableERC20 is ERC20 {
    constructor() ERC20("MINE", "MINE") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}
