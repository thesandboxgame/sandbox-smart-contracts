// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import {UpgradeableBeacon} from "@openzeppelin/contracts-0.8.15/proxy/beacon/UpgradeableBeacon.sol";

contract MockUpgradeableBeacon is UpgradeableBeacon {
    constructor(address implementation_) UpgradeableBeacon(implementation_) {}
}
