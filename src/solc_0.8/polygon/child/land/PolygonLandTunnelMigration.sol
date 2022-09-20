// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/interfaces/IPolygonLand.sol";
import "../../../common/interfaces/IPolygonLandTunnel.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";

/// @title Tunnel migration on L2
contract PolygonLandTunnelMigration is IERC721MandatoryTokenReceiver {
    uint256 private constant GRID_SIZE = 408;

    struct OwnerWithLandIds {
        address owner;
        uint256[] ids;
    }

    IPolygonLand public polygonLand;
    address public newLandTunnel;
    address public oldLandTunnel;

    event TunnelLandsMigrated(address oldLandTunnel, address newLandTunnel, uint256[] ids);
    event TunnelLandsMigratedWithWithdraw(OwnerWithLandIds[] _ownerWithLandIds);

    constructor(
        address _polygonLand,
        address _newLandTunnel,
        address _oldLandTunnel
    ) {
        polygonLand = IPolygonLand(_polygonLand);
        newLandTunnel = _newLandTunnel;
        oldLandTunnel = _oldLandTunnel;
    }

    /// @dev Transfers all the passed land ids from the old land tunnel to the new land tunnel
    /// @notice This method needs super operator role to execute
    /// @param ids of land tokens to be migrated
    function migrateToTunnel(uint256[] memory ids) external {
        polygonLand.batchTransferFrom(oldLandTunnel, newLandTunnel, ids, "0x");
        emit TunnelLandsMigrated(oldLandTunnel, newLandTunnel, ids);
    }

    /// @dev Fetches all locked land ids to this contract and withdraws again through the new tunnel
    /// @notice This method needs super operator role to execute
    /// @param _ownerWithLandIds array of struct containing token owners with their land ids
    function migrateToTunnelWithWithdraw(OwnerWithLandIds[] memory _ownerWithLandIds) external {
        uint256 numOfOwners = _ownerWithLandIds.length;

        // check for gas limits based on the number of locked tokens
        for (uint256 i = 0; i < numOfOwners; i++) {
            // Fetch locked tokens to this contract address
            uint256[] memory ids = _ownerWithLandIds[i].ids;
            polygonLand.batchTransferFrom(oldLandTunnel, address(this), ids, "0x");

            // Calculate x and y values for token ids
            uint256 numOfIds = ids.length;
            uint256[] memory x = new uint256[](numOfIds);
            uint256[] memory y = new uint256[](numOfIds);
            uint256[] memory sizes = new uint256[](numOfIds);
            for (uint256 j; j <= ids.length; j++) {
                x[i] = ids[j] % GRID_SIZE;
                y[i] = ids[j] / GRID_SIZE;
                sizes[i] = 1;
            }

            // Withdraw tokens to L1
            IPolygonLandTunnel(newLandTunnel).batchTransferQuadToL1(_ownerWithLandIds[i].owner, sizes, x, y, "0x");
        }
        emit TunnelLandsMigratedWithWithdraw(_ownerWithLandIds);
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
