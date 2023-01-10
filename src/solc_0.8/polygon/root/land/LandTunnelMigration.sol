// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/interfaces/ILandToken.sol";

/// @title Tunnel migration on L1
contract LandTunnelMigration {
    uint256 private constant GRID_SIZE = 408;

    ILandToken public landToken;
    address public newLandTunnel;
    address public oldLandTunnel;
    address private admin;

    event TunnelLandsMigrated(address oldLandTunnel, address newLandTunnel, uint256[] ids);
    event TunnelQuadsMigrated(address oldLandTunnel, address newLandTunnel, uint256[] sizes, uint256[] x, uint256[] y);

    modifier isAdmin() {
        require(admin == msg.sender, "!AUTHORISED");
        _;
    }

    constructor(
        address _landToken,
        address _newLandTunnel,
        address _oldLandTunnel,
        address _admin
    ) {
        admin = _admin;
        landToken = ILandToken(_landToken);
        newLandTunnel = _newLandTunnel;
        oldLandTunnel = _oldLandTunnel;
    }

    /// @dev Transfers all the passed land ids from the old land tunnel to the new land tunnel
    /// @notice This method needs super operator role to execute
    /// @param ids of land tokens to be migrated
    function migrateLandsToTunnel(uint256[] memory ids) external isAdmin {
        landToken.batchTransferFrom(oldLandTunnel, newLandTunnel, ids, "0x");
        emit TunnelLandsMigrated(oldLandTunnel, newLandTunnel, ids);
    }

    /// @dev Transfers all the passed quads from the old land tunnel to the new land tunnel
    /// @notice This method needs super operator role to execute
    /// @param sizes of land quads to be migrated
    /// @param x coordinate of land quads to be migrated
    /// @param y coordinate of land quads to be migrated
    function migrateQuadsToTunnel(
        uint256[] memory sizes,
        uint256[] memory x,
        uint256[] memory y
    ) external isAdmin {
        landToken.batchTransferQuad(oldLandTunnel, newLandTunnel, sizes, x, y, "0x");
        emit TunnelQuadsMigrated(oldLandTunnel, newLandTunnel, sizes, x, y);
    }
}
