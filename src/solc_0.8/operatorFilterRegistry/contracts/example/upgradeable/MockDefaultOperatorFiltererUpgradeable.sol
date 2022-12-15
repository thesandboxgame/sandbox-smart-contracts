//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {MockOperatorFiltererUpgradeable} from "./MockOperatorFiltererUpgradeable.sol";
import {IOperatorFilterRegistry} from "../../../interfaces/IOperatorFilterRegistry.sol";

abstract contract MockDefaultOperatorFiltererUpgradeable is MockOperatorFiltererUpgradeable {
    address public constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    function __MockDefaultOperatorFilterer_init(bool subscribe, address _operatorFilterRegistry) internal {
        __MockOperatorFilterer_init(DEFAULT_SUBSCRIPTION, subscribe, _operatorFilterRegistry);
    }

    /**
     * @notice Update the address that the contract will make OperatorFilter checks against. When set to the zero
     *         address, checks will be permanently bypassed, and the address cannot be updated again. OnlyOwner.
     */
    function updateOperatorFilterRegistryAddress(address newRegistry) public override {
        if (msg.sender != owner()) {
            revert("Only Owner");
        }
        // if registry has been revoked, do not allow further updates
        if (isOperatorFilterRegistryRevoked) {
            revert("Registry has been revoked");
        }

        operatorFilterRegistry = IOperatorFilterRegistry(newRegistry);
    }

    /**
     * @notice Revoke the OperatorFilterRegistry address, permanently bypassing checks. OnlyOwner.
     */
    function revokeOperatorFilterRegistry() public {
        if (msg.sender != owner()) {
            revert("Only Owner");
        }
        // if registry has been revoked, do not allow further updates
        if (isOperatorFilterRegistryRevoked) {
            revert("Registry has been revoked");
        }

        // set to zero address to bypass checks
        operatorFilterRegistry = IOperatorFilterRegistry(address(0));
        isOperatorFilterRegistryRevoked = true;
    }
}
