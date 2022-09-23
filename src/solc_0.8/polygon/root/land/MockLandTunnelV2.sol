// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./LandTunnelV2.sol";

contract MockLandTunnelV2 is LandTunnelV2 {
    function receiveMessage(bytes memory inputData) public override {
        _processMessageFromChild(inputData);
    }
}
