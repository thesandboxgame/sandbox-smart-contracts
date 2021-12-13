// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./LandTunnel.sol";

contract MockLandTunnel is LandTunnel {
    constructor(
        address _checkpointManager,
        address _fxRoot,
        address _rootToken
    ) LandTunnel(_checkpointManager, _fxRoot, _rootToken) {}
}
