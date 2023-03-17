//SPDX-License-Identifier: MIT
pragma solidity 0.5.9;

import {IOperatorFilterRegistry} from "../../interfaces/IOperatorFilterRegistry.sol";
import {AddressUtils} from "../../../contracts_common/Libraries/AddressUtils.sol";

///@title OperatorFiltererUpgradeable
///@notice This contract would subscibe or copy or just to the subscription provided or just register to default subscription list
contract OperatorFiltererUpgradeable {
    using AddressUtils for address;
    IOperatorFilterRegistry public operatorFilterRegistry;

    function _register(address subscriptionOrRegistrantToCopy, bool subscribe) internal {
        // If an inheriting token contract is deployed to a network without the registry deployed, the modifier
        // will not revert, but the contract will need to be registered with the registry once it is deployed in
        // order for the modifier to filter addresses.
        if (address(operatorFilterRegistry).isContract()) {
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

    modifier onlyAllowedOperator(address from) {
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(operatorFilterRegistry).isContract()) {
            // Allow spending tokens from addresses with balance
            // Note that this still allows listings and marketplaces with escrow to transfer tokens if transferred
            // from an EOA.
            if (from == msg.sender) {
                _;
                return;
            }
            if (!operatorFilterRegistry.isOperatorAllowed(address(this), msg.sender)) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }

    modifier onlyAllowedOperatorApproval(address operator) {
        // Check registry code length to facilitate testing in environments without a deployed registry.
        if (address(operatorFilterRegistry).isContract()) {
            if (!operatorFilterRegistry.isOperatorAllowed(address(this), operator)) {
                revert("Operator Not Allowed");
            }
        }
        _;
    }
}
