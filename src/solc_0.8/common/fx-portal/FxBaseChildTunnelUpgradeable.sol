// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "@maticnetwork/fx-portal/contracts/tunnel/FxBaseChildTunnel.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract FxBaseChildTunnelUpgradeable is FxBaseChildTunnel, Initializable {
    // solhint-disable-next-line no-empty-blocks
    constructor() FxBaseChildTunnel(address(0)) {}

    function __FxBaseChildTunnelUpgradeable_initialize(address _fxChild) internal onlyInitializing {
        fxChild = _fxChild;
    }

    uint256[50] private __gap;
}
