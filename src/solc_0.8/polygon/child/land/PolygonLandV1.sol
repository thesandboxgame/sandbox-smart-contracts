// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "./PolygonLandBaseToken.sol";

// @todo - natspec comments

contract PolygonLandV1 is PolygonLandBaseToken {
    address public polygonLandTunnel;

    bool internal _initialized;

    modifier initializer() {
        require(!_initialized, "PolygonLandV1: Contract already initialized");
        _;
    }

    function initialize(address trustedForwarder) external initializer {
        _admin = _msgSender();
        _initialized = true;
        __ERC2771Handler_initialize(trustedForwarder);
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

    // Empty storage space in contracts for future enhancements
    // ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13)
    uint256[49] private __gap;
}
