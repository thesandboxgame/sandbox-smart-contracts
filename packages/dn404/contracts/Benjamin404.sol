//SPDX-License-Identifier: MIT
pragma solidity 0.8.21;

import {NFTMintDN404} from "dn404/src/example/NFTMintDN404.sol";

contract Benjamin404 is NFTMintDN404 {

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 allowlistRoot_,
        uint96 publicPrice_,
        uint96 allowlistPrice_,
        uint96 initialTokenSupply,
        address initialSupplyOwner
    ) NFTMintDN404(
        name_,
        symbol_,
        allowlistRoot_,
        publicPrice_,
        allowlistPrice_,
        initialTokenSupply
    ){}
}