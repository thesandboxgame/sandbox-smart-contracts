//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "./ERC20Token.sol";

contract Gem is ERC20Token {
    uint256 public immutable gemId;

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        uint256 _gemId
    ) ERC20Token(name, symbol, admin) {
        gemId = _gemId;
    }
}
