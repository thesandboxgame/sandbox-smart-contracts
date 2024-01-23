//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IOperatorFilterRegistry} from "./IOperatorFilterRegistry.sol";

///@title OperatorFiltererUpgradeable
///@author The Sandbox
///@notice This contract would subscibe or copy or just to the subscription provided or just register to default subscription list
///@dev This contract is the upgradeable version of the OpenSea implementation https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterer.sol and adapted to the 0.5.9 solidity version
abstract contract OperatorFiltererUpgradeable is ContextUpgradeable {
    IOperatorFilterRegistry public operatorFilterRegistry;

    event ContractRegistered(address indexed subscriptionOrRegistrant, bool subscribe);

    // solhint-disable-next-line func-name-mixedcase
    function __OperatorFilterer_init(address subscriptionOrRegistrantToCopy, bool subscribe) internal onlyInitializing {
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    /**
     * @notice Register this contract into the registry
     * @param subscriptionOrRegistrantToCopy address to subscribe or copy entries from
     * @param subscribe should it subscribe
     */
    function _register(address subscriptionOrRegistrantToCopy, bool subscribe) internal {
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
        emit ContractRegistered(subscriptionOrRegistrantToCopy, subscribe);
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
}
