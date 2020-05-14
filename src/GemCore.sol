pragma solidity 0.6.5;

import "./Catalyst/ERC20Group.sol";


contract GemCore is ERC20Group {
    constructor(address admin, address minter) public ERC20Group(admin, minter) {}
}
