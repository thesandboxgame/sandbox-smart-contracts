// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./PolygonLandBaseToken.sol";

/// @title LAND token on L2
contract PolygonLandV1 is PolygonLandBaseToken {
    address public polygonLandTunnel;

    function initialize(address trustedForwarder) external initializer {
        _admin = _msgSender();
        __ERC2771Handler_initialize(trustedForwarder);
    }

    function setPolygonLandTunnel(address _polygonLandTunnel) external onlyAdmin {
        require(_polygonLandTunnel != address(0), "PolygonLand: Invalid address");
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
