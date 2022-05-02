// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./PolygonLandBaseToken.sol";

/// @title LAND token on L2
contract PolygonLandV1 is PolygonLandBaseToken {
    function initialize(address trustedForwarder) external initializer {
        _admin = _msgSender();
        __ERC2771Handler_initialize(trustedForwarder);
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyAdmin {
        _trustedForwarder = trustedForwarder;
    }
}
