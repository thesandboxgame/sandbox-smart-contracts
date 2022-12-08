//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MockOperatorFiltererUpgradeable} from "./MockOperatorFiltererUpgradeable.sol";

abstract contract MockDefaultOperatorFiltererUpgradeable is MockOperatorFiltererUpgradeable {
    address public constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    function __MockDefaultOperatorFilterer_init(bool subscribe, address _operatorFilterRegistry) internal {
        __MockOperatorFilterer_init(DEFAULT_SUBSCRIPTION, subscribe, _operatorFilterRegistry);
    }
}
