//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {OperatorFiltererUpgradeable} from "./OperatorFiltererUpgradeable.sol";

abstract contract DefaultOperatorFiltererUpgradeable is OperatorFiltererUpgradeable {
    address public constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    function __DefaultOperatorFilterer_init(bool subscribe) internal {
        __OperatorFilterer_initialize(DEFAULT_SUBSCRIPTION, subscribe);
    }
}
