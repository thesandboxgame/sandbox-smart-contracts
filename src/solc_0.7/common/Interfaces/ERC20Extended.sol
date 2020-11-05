//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "./ERC20.sol";

interface ERC20Extended is ERC20 {
    function burnFor(address from, uint256 amount) external;

    function burn(uint256 amount) external;
}
