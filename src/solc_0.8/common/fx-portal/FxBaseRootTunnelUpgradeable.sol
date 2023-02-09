// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {
    FxBaseRootTunnel,
    ICheckpointManager,
    IFxStateSender
} from "@maticnetwork/fx-portal/contracts/tunnel/FxBaseRootTunnel.sol";

abstract contract FxBaseRootTunnelUpgradeable is FxBaseRootTunnel {
    // solhint-disable-next-line no-empty-blocks
    constructor() FxBaseRootTunnel(address(0), address(0)) {}

    function __FxBaseRootTunnelUpgradeable_initialize(address _checkpointManager, address _fxRoot) internal {
        checkpointManager = ICheckpointManager(_checkpointManager);
        fxRoot = IFxStateSender(_fxRoot);
    }

    uint256[50] private __gap;
}
