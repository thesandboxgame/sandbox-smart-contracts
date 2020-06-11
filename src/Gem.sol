pragma solidity 0.6.5;

import "./Catalyst/ERC20SubToken.sol";

contract Gem is ERC20SubToken {
    constructor(
        ERC20Group group,
        uint256 index,
        string memory name,
        string memory symbol,
        address admin
    ) public ERC20SubToken(group, index, name, symbol, admin) {}
}
