//SPDX-License-Identifier: MIT
pragma solidity 0.5.9;

import {IOperatorFilterRegistry} from "../../OperatorFilterer/interfaces/IOperatorFilterRegistry.sol";
import {AddressUtils} from "./AddressUtils.sol";

///@title OperatorFiltererUpgradeable
///@notice This contract would subscibe or copy or just to the subscription provided or just register to default subscription list
library OperatorFiltererLib {
    using AddressUtils for address;

    address public constant REGISTRY = 0x000000000000AAeB6D7670E522A718067333cd4E;

    function __OperatorFilterer_init(address subscriptionOrRegistrantToCopy, bool subscribe, address registry) internal {

        IOperatorFilterRegistry operatorFilterRegistry =
        // Address of the operator filterer registry
        IOperatorFilterRegistry(registry);

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

    function registry() public view returns (address) {
        return REGISTRY;
    }
}
