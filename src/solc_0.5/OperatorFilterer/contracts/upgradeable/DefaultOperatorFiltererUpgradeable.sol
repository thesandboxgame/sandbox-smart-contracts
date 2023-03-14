//SPDX-License-Identifier: MIT
pragma solidity 0.5.9;

import {OperatorFiltererUpgradeable} from "./OperatorFiltererUpgradeable.sol";

///@title DefaultOperatorFiltererUpgradeable
///@notice This contract is ment to be imported in Token contracts to subscribe to the default Black list of Opensea.
contract DefaultOperatorFiltererUpgradeable is OperatorFiltererUpgradeable {
    //Registration address of the default subscription list.
    address public constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    function __DefaultOperatorFilterer_init(bool subscribe) internal {
        _register(DEFAULT_SUBSCRIPTION, subscribe);
    }
}
