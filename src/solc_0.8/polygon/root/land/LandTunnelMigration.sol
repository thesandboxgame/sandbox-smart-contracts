// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/interfaces/ILandToken.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";

/// @title Tunnel migration on L1
contract LandTunnelMigration is IERC721MandatoryTokenReceiver {
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

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x5e8bf644;
    }
}
