//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/// @title OperatorFilterSubription
/// @notice This contract is ment to register and copy the default subscription of the openSea for the operator filter and our Token contract are supposed to subscribe to This contract on openSea operator filter registry
/// @custom:experimental This is an experimental contract. There could be future changes according to the change in the requirements
contract OperatorFilterSubscription is OwnableUpgradeable {
    address public constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    IOperatorFilterRegistry public constant operatorFilterRegistry =
        IOperatorFilterRegistry(0x000000000000AAeB6D7670E522A718067333cd4E);

    function initialize() external initializer {
        // Subscribe and copy the entries of the Default subscription list of open sea.
        if (address(operatorFilterRegistry).code.length > 0) {
            operatorFilterRegistry.registerAndCopyEntries(address(this), DEFAULT_SUBSCRIPTION);
        }
        __Ownable_init();
    }
}
