// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {ILandToken} from "../../../common/interfaces/ILandToken.sol";

/// @title Tunnel migration on L1
/// @author The Sandbox
/// @notice Contract handling the migration of LAND tokens from a tunnel to a new one
contract LandTunnelMigration {
    ILandToken public immutable landToken;
    address public immutable newLandTunnel;
    address public immutable oldLandTunnel;
    address private admin;

    event TunnelLandsMigrated(address indexed oldLandTunnel, address indexed newLandTunnel, uint256[] ids);
    event TunnelQuadsMigrated(
        address indexed oldLandTunnel,
        address indexed newLandTunnel,
        uint256[] sizes,
        uint256[] x,
        uint256[] y
    );
    event AdminChanged(address indexed _newAdmin);

    modifier isAdmin() {
        require(admin == msg.sender, "LandTunnelMigration: !AUTHORISED");
        _;
    }

    /// @notice Constructor of the tunnel migration contract
    /// @param _landToken LAND token address
    /// @param _newLandTunnel the tunnel address to migrate to
    /// @param _oldLandTunnel the tunnel address to migrate from
    /// @param _admin admin of the contract
    constructor(
        address _landToken,
        address _newLandTunnel,
        address _oldLandTunnel,
        address _admin
    ) {
        require(_admin != address(0), "LandTunnelMigration: admin can't be zero address");
        require(_landToken != address(0), "LandTunnelMigration: landToken can't be zero address");
        require(_newLandTunnel != address(0), "LandTunnelMigration: new Tunnel can't be zero address");
        require(_oldLandTunnel != address(0), "LandTunnelMigration: old Tunnel can't be zero address");

        admin = _admin;
        landToken = ILandToken(_landToken);
        newLandTunnel = _newLandTunnel;
        oldLandTunnel = _oldLandTunnel;

        emit AdminChanged(_admin);
    }

    /// @dev Transfers all the passed land ids from the old land tunnel to the new land tunnel
    /// @notice This method needs super operator role to execute
    /// @param ids of land tokens to be migrated
    function migrateLandsToTunnel(uint256[] memory ids) external isAdmin {
        landToken.batchTransferFrom(oldLandTunnel, newLandTunnel, ids, "");
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
        landToken.batchTransferQuad(oldLandTunnel, newLandTunnel, sizes, x, y, "");
        emit TunnelQuadsMigrated(oldLandTunnel, newLandTunnel, sizes, x, y);
    }

    /// @notice changes admin to new admin
    /// @param _newAdmin the new admin to be set
    function changeAdmin(address _newAdmin) external isAdmin {
        require(_newAdmin != address(0), "LandTunnelMigration: admin can't be zero address");
        admin = _newAdmin;
        emit AdminChanged(_newAdmin);
    }
}
