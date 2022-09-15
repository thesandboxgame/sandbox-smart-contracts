// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/interfaces/ILandToken.sol";

/// @title Tunnel migration on L1
contract LandTunnelMigration {
    uint256 private constant GRID_SIZE = 408;

    ILandToken public landToken;
    address public newLandTunnel;
    address public oldLandTunnel;

    event TunnelLandsMigrated(address oldLandTunnel, address newLandTunnel, uint256[] ids);

    constructor(
        address _landToken,
        address _newLandTunnel,
        address _oldLandTunnel
    ) {
        landToken = ILandToken(_landToken);
        newLandTunnel = _newLandTunnel;
        oldLandTunnel = _oldLandTunnel;
    }

    /// @dev Transfers all the passed land ids from the old land tunnel to the new land tunnel
    /// @notice This method needs super operator role to execute
    /// @param ids of land tokens to be migrated
    function migrateToTunnel(uint256[] memory ids) external {
        landToken.batchTransferFrom(oldLandTunnel, newLandTunnel, ids, "0x");
        emit TunnelLandsMigrated(oldLandTunnel, newLandTunnel, ids);
    }
}
