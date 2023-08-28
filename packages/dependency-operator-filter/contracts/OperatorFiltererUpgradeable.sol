//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IOperatorFilterRegistry} from "./interfaces/IOperatorFilterRegistry.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";

///@title OperatorFiltererUpgradeable
///@author The SandBox
///@notice This contract would subscibe or copy or just to the subscription provided or just register to default subscription list. The operator filter registry's addess could be set using a setter which could be implemented in inherting contract
abstract contract OperatorFiltererUpgradeable is Initializable, ContextUpgradeable {
    event OperatorFilterRegistrySet(address indexed registry);

    IOperatorFilterRegistry private operatorFilterRegistry;

    // solhint-disable-next-line func-name-mixedcase
    function __OperatorFilterer_init(address subscriptionOrRegistrantToCopy, bool subscribe) internal onlyInitializing {
        operatorFilterRegistry = IOperatorFilterRegistry(0x000000000000AAeB6D7670E522A718067333cd4E); // Address of the operator filterer registry
        // If an inheriting token contract is deployed to a network without the registry deployed, the modifier
        // will not revert, but the contract will need to be registered with the registry once it is deployed in
        // order for the modifier to filter addresses.
        _registerAndSubscribe(subscriptionOrRegistrantToCopy, subscribe);
    }

    function _registerAndSubscribe(address subscriptionOrRegistrantToCopy, bool subscribe) internal {
        if (address(operatorFilterRegistry).code.length > 0) {
            if (!operatorFilterRegistry.isRegistered(address(this))) {
                if (subscribe) {
                    operatorFilterRegistry.registerAndSubscribe(address(this), subscriptionOrRegistrantToCopy);
                } else {
                    if (subscriptionOrRegistrantToCopy != address(0)) {
                        operatorFilterRegistry.registerAndCopyEntries(address(this), subscriptionOrRegistrantToCopy);
                    } else {
                        operatorFilterRegistry.register(address(this));
                    }
                }
            }
        }
    }

    modifier onlyAllowedOperator(address from) virtual {
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(operatorFilterRegistry).code.length > 0) {
            // Allow spending tokens from addresses with balance
            // Note that this still allows listings and marketplaces with escrow to transfer tokens if transferred
            // from an EOA.
            if (from == _msgSender()) {
                _;
                return;
            }
            if (!operatorFilterRegistry.isOperatorAllowed(address(this), _msgSender())) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }

    modifier onlyAllowedOperatorApproval(address operator) virtual {
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(operatorFilterRegistry).code.length > 0) {
            if (!operatorFilterRegistry.isOperatorAllowed(address(this), operator)) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }

    /// @notice returns the operator filter registry.
    /// @return address of operator filter registry contract.
    function getOperatorFilterRegistry() external view returns (IOperatorFilterRegistry) {
        return _getOperatorFilterRegistry();
    }

    /// @notice internal method to set the operator filter registry
    /// @param registry address the registry.
    function _setOperatorFilterRegistry(address registry) internal {
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
        emit OperatorFilterRegistrySet(registry);
    }

    /// @notice internal method to get the operator filter registry.
    function _getOperatorFilterRegistry() internal view returns (IOperatorFilterRegistry) {
        return operatorFilterRegistry;
    }
}
