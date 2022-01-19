// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./PolygonLandBaseToken.sol";

// @todo - natspec comments

contract PolygonLand is PolygonLandBaseToken {
    address public polygonLandTunnel;

    constructor() {
        _admin = _msgSender();
    }

    function setPolygonLandTunnel(address _polygonLandTunnel) external onlyAdmin {
        polygonLandTunnel = _polygonLandTunnel;
    }

    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyAdmin {
        _trustedForwarder = trustedForwarder;
    }

    function mint(
        address user,
        uint256 size,
        uint256 x,
        uint256 y,
        bytes memory data
    ) external {
        require(_msgSender() == polygonLandTunnel, "Invalid sender");
        _mintQuad(user, size, x, y, data);
    }
}
