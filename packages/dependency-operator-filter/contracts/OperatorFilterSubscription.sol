//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IOperatorFilterRegistry} from "./interfaces/IOperatorFilterRegistry.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title OperatorFilterSubription
/// @author The Sandbox
/// @notice This contract is meant to register and copy the default subscription of the OpenSea for the operator filter and our Token contract are supposed to subscribe to this contract on openSea operator filter registry
contract OperatorFilterSubscription is Ownable {
    address public constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    IOperatorFilterRegistry public constant operatorFilterRegistry =
        IOperatorFilterRegistry(0x000000000000AAeB6D7670E522A718067333cd4E);

    constructor() Ownable() {
        // Subscribe and copy the entries of the Default subscription list of open sea.
        if (address(operatorFilterRegistry).code.length > 0) {
            operatorFilterRegistry.registerAndCopyEntries(address(this), DEFAULT_SUBSCRIPTION);
        }
    }
}