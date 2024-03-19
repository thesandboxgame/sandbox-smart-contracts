//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IOperatorFilterRegistry} from "../common/IOperatorFilterRegistry.sol";
import {IContext} from "./IContext.sol";

///@title OperatorFiltererUpgradeable
///@author The Sandbox
///@notice This contract would subscibe or copy or just to the subscription provided or just register to default subscription list
///@dev This contract is the upgradeable version of the OpenSea implementation https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterer.sol and adapted to the 0.5.9 solidity version
abstract contract OperatorFiltererUpgradeable is IContext {
    event ContractRegistered(address indexed subscriptionOrRegistrant, bool subscribe);

    function operatorFilterRegistry() external view returns (IOperatorFilterRegistry) {
        return _getOperatorFilterRegistry();
    }

    /**
     * @notice Register this contract into the registry
     * @param subscriptionOrRegistrantToCopy address to subscribe or copy entries from
     * @param subscribe should it subscribe
     */
    function _register(address subscriptionOrRegistrantToCopy, bool subscribe) internal {
        IOperatorFilterRegistry registry = _getOperatorFilterRegistry();
        if (address(registry).code.length > 0) {
            if (!registry.isRegistered(address(this))) {
                if (subscribe) {
                    registry.registerAndSubscribe(address(this), subscriptionOrRegistrantToCopy);
                } else {
                    if (subscriptionOrRegistrantToCopy != address(0)) {
                        registry.registerAndCopyEntries(address(this), subscriptionOrRegistrantToCopy);
                    } else {
                        registry.register(address(this));
                    }
                }
            }
        }
        emit ContractRegistered(subscriptionOrRegistrantToCopy, subscribe);
    }

    modifier onlyAllowedOperator(address from) virtual {
        IOperatorFilterRegistry registry = _getOperatorFilterRegistry();
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(registry).code.length > 0) {
            // Allow spending tokens from addresses with balance
            // Note that this still allows listings and marketplaces with escrow to transfer tokens if transferred
            // from an EOA.
            if (from == _msgSender()) {
                _;
                return;
            }
            if (!registry.isOperatorAllowed(address(this), _msgSender())) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }

    modifier onlyAllowedOperatorApproval(address operator) virtual {
        IOperatorFilterRegistry registry = _getOperatorFilterRegistry();
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(registry).code.length > 0) {
            if (!registry.isOperatorAllowed(address(this), operator)) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }

    function _getOperatorFilterRegistry() internal view virtual returns (IOperatorFilterRegistry);

    function _setOperatorFilterRegistry(IOperatorFilterRegistry registry) internal virtual;
}
