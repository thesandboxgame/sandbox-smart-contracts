// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/ERC20.sol";

contract MockPolygonSand is ERC20 {
    constructor() ERC20("Sand", "SAND") {
        _mint(msg.sender, 1000000000000000000000000000);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
