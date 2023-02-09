// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {FxBaseChildTunnel} from "@maticnetwork/fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";

abstract contract FxBaseChildTunnelUpgradeable is FxBaseChildTunnel {
    // solhint-disable-next-line no-empty-blocks
    constructor() FxBaseChildTunnel(address(0)) {}

    function __FxBaseChildTunnelUpgradeable_initialize(address _fxChild) internal {
        fxChild = _fxChild;
    }

    uint256[50] private __gap;
}
