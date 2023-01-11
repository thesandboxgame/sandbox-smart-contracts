// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../common/interfaces/IPolygonLandWithSetApproval.sol";
import "../../../common/interfaces/IPolygonLandTunnel.sol";
import "../../../common/interfaces/IERC721MandatoryTokenReceiver.sol";

/// @title Tunnel migration on L2
contract PolygonLandTunnelMigration is IERC721MandatoryTokenReceiver {
    uint256 private constant GRID_SIZE = 408;

    struct OwnerWithLandIds {
        address owner;
        uint256[] sizes;
        uint256[] x;
        uint256[] y;
    }

    IPolygonLandWithSetApproval public polygonLand;
    address public newLandTunnel;
    address public oldLandTunnel;
    address private admin;

    event TunnelLandsMigrated(address indexed oldLandTunnel, address indexed newLandTunnel, uint256[] ids);
    event TunnelLandsMigratedWithWithdraw(OwnerWithLandIds[] _ownerWithLandIds);
    event TunnelQuadsMigrated(
        address indexed oldLandTunnel,
        address indexed newLandTunnel,
        uint256[] sizes,
        uint256[] x,
        uint256[] y
    );

    modifier isAdmin() {
        require(admin == msg.sender, "!AUTHORISED");
        _;
    }

    constructor(
        address _polygonLand,
        address _newLandTunnel,
        address _oldLandTunnel,
        address _admin
    ) {
        admin = _admin;
        polygonLand = IPolygonLandWithSetApproval(_polygonLand);
        newLandTunnel = _newLandTunnel;
        oldLandTunnel = _oldLandTunnel;
    }

    /// @dev Transfers all the passed land ids from the old land tunnel to the new land tunnel
    /// @notice This method needs super operator role to execute
    /// @param ids of land tokens to be migrated
    function migrateLandsToTunnel(uint256[] memory ids) external isAdmin {
        polygonLand.batchTransferFrom(oldLandTunnel, newLandTunnel, ids, "0x");
        emit TunnelLandsMigrated(oldLandTunnel, newLandTunnel, ids);
    }

    /// @dev Fetches all locked land ids to this contract and withdraws again through the new tunnel
    /// @notice This method needs super operator role to execute
    /// @param _ownerWithLandIds array of struct containing token owners with their land ids
    function migrateToTunnelWithWithdraw(OwnerWithLandIds[] memory _ownerWithLandIds) external isAdmin {
        uint256 numOfOwners = _ownerWithLandIds.length;
        polygonLand.setApprovalForAll(newLandTunnel, true);
        // check for gas limits based on the number of locked tokens
        for (uint256 i = 0; i < numOfOwners; i++) {
            // Fetch locked tokens to this contract address
            polygonLand.batchTransferQuad(
                oldLandTunnel,
                address(this),
                _ownerWithLandIds[i].sizes,
                _ownerWithLandIds[i].x,
                _ownerWithLandIds[i].y,
                "0x"
            );
            // Withdraw tokens to L1
            IPolygonLandTunnel(newLandTunnel).batchTransferQuadToL1(
                _ownerWithLandIds[i].owner,
                _ownerWithLandIds[i].sizes,
                _ownerWithLandIds[i].x,
                _ownerWithLandIds[i].y,
                "0x"
            );
        }
        emit TunnelLandsMigratedWithWithdraw(_ownerWithLandIds);
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
        polygonLand.batchTransferQuad(oldLandTunnel, newLandTunnel, sizes, x, y, "0x");
        emit TunnelQuadsMigrated(oldLandTunnel, newLandTunnel, sizes, x, y);
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
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }
}
