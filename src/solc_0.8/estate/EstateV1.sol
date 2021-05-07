//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./EstateBaseToken.sol";

// solhint-disable-next-line no-empty-blocks
contract EstateV1 is EstateBaseToken {
    // solhint-disable-next-line no-empty-blocks
    constructor(address trustedForwarder, LandToken land, uint8 chainIndex) EstateBaseToken(trustedForwarder, land, chainIndex) {}
}
