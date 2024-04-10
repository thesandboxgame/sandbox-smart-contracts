//SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {SimpleDN404} from "dn404/src/example/SimpleDN404.sol";

contract Simples404 is SimpleDN404 {

    constructor(
        string memory name_,
        string memory symbol_,
        uint96 initialTokenSupply,
        address initialSupplyOwner
    ) SimpleDN404(
        name_,
        symbol_,
        initialTokenSupply,
        initialSupplyOwner
    ){}
}