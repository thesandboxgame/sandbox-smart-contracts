pragma solidity 0.6.5;

import "./Catalyst/ERC20SubToken.sol";


contract Gem is ERC20SubToken {
    constructor(
        string memory name,
        string memory symbol,
        address admin
    ) public ERC20SubToken(name, symbol, admin) {}
}
