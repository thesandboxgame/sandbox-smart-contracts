// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {FxBaseChildTunnel} from "@maticnetwork/fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";

/**
 * @title FxBaseChildTunnelUpgradeable
 * @author The Sandbox
 * @dev Upgradeable version of the fx-portal tunnel for the child chain
 */
abstract contract FxBaseChildTunnelUpgradeable is FxBaseChildTunnel {
    // solhint-disable-next-line no-empty-blocks
    constructor() FxBaseChildTunnel(address(0)) {}

    /**
     * @dev Initializes the contract
     * @param _fxChild fx child
     */
    function __FxBaseChildTunnelUpgradeable_initialize(address _fxChild) internal {
        fxChild = _fxChild;
    }

    uint256[50] private __gap;
}
