//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {IOperatorFilterRegistry} from "./IOperatorFilterRegistry.sol";

///@title OperatorFiltererUpgradeable
///@author The Sandbox
///@notice This contract would subscibe or copy or just to the subscription provided or just register to default subscription list
///@dev This contract is the upgradeable version of the OpenSea implementation https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterer.sol and adapted to the 0.8.2 solidity version
abstract contract OperatorFiltererUpgradeable is ContextUpgradeable {
    event ContractRegistered(address indexed subscriptionOrRegistrant, bool subscribe);

    // solhint-disable-next-line func-name-mixedcase
    function __OperatorFilterer_init(address subscriptionOrRegistrantToCopy, bool subscribe) internal onlyInitializing {
        _register(subscriptionOrRegistrantToCopy, subscribe);
    }

    function operatorFilterRegistry() external view returns (IOperatorFilterRegistry) {
        return IOperatorFilterRegistry($getOperatorFilterRegistry());
    }

    /**
     * @notice Register this contract into the registry
     * @param subscriptionOrRegistrantToCopy address to subscribe or copy entries from
     * @param subscribe should it subscribe
     */
    function _register(address subscriptionOrRegistrantToCopy, bool subscribe) internal {
        IOperatorFilterRegistry filterRegistry = IOperatorFilterRegistry($getOperatorFilterRegistry());
        if (address(filterRegistry).code.length > 0) {
            if (!filterRegistry.isRegistered(address(this))) {
                if (subscribe) {
                    filterRegistry.registerAndSubscribe(address(this), subscriptionOrRegistrantToCopy);
                } else {
                    if (subscriptionOrRegistrantToCopy != address(0)) {
                        filterRegistry.registerAndCopyEntries(address(this), subscriptionOrRegistrantToCopy);
                    } else {
                        filterRegistry.register(address(this));
                    }
                }
            }
        }
        emit ContractRegistered(subscriptionOrRegistrantToCopy, subscribe);
    }

    modifier onlyAllowedOperator(address from) virtual {
        IOperatorFilterRegistry filterRegistry = IOperatorFilterRegistry($getOperatorFilterRegistry());
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(filterRegistry).code.length > 0) {
            // Allow spending tokens from addresses with balance
            // Note that this still allows listings and marketplaces with escrow to transfer tokens if transferred
            // from an EOA.
            if (from == _msgSender()) {
                _;
                return;
            }
            if (!filterRegistry.isOperatorAllowed(address(this), _msgSender())) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }

    modifier onlyAllowedOperatorApproval(address operator) virtual {
        IOperatorFilterRegistry filterRegistry = IOperatorFilterRegistry($getOperatorFilterRegistry());
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(filterRegistry).code.length > 0) {
            if (!filterRegistry.isOperatorAllowed(address(this), operator)) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }

    ///@dev Implement
    function $getOperatorFilterRegistry() internal view virtual returns (address);
}
