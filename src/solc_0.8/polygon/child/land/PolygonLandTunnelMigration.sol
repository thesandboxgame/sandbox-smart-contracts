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
    event TunnelLandsMigratedWithWithdraw(OwnerWithLandIds _ownerWithLandIds);
    event TunnelQuadsMigrated(
        address indexed oldLandTunnel,
        address indexed newLandTunnel,
        uint256[] sizes,
        uint256[] x,
        uint256[] y
    );
    event AdminChanged(address _newAdmin);

    modifier isAdmin() {
        require(admin == msg.sender, "PolygonLandTunnelMigration: !AUTHORISED");
        _;
    }

    /// @notice changes admin to new admin
    /// @param _newAdmin the new admin to be set
    function changeAdmin(address _newAdmin) external isAdmin {
        require(_newAdmin != address(0), "PolygonLandTunnelMigration: admin can't be zero address");
        admin = _newAdmin;
        emit AdminChanged(_newAdmin);
    }

    constructor(
        address _polygonLand,
        address _newLandTunnel,
        address _oldLandTunnel,
        address _admin
    ) {
        require(_admin != address(0), "PolygonLandTunnelMigration: admin cant be zero address");
        require(_polygonLand != address(0), "PolygonLandTunnelMigration: polygonLand cant be zero address");
        require(_newLandTunnel != address(0), "PolygonLandTunnelMigration: new Tunnel cant be zero address");
        require(_oldLandTunnel != address(0), "PolygonLandTunnelMigration: old Tunnel cant be zero address");
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

    /// @dev Fetches locked land ids to this contract and withdraws again through the new tunnel
    /// @notice This method needs super operator role to execute
    /// @param _ownerWithLandIds struct containing token owner with their land ids
    function migrateToTunnelWithWithdraw(OwnerWithLandIds memory _ownerWithLandIds) external isAdmin {
        // check for gas limits based on the number of locked tokens
        // Fetch locked tokens to this contract address
        polygonLand.batchTransferQuad(
            oldLandTunnel,
            address(this),
            _ownerWithLandIds.sizes,
            _ownerWithLandIds.x,
            _ownerWithLandIds.y,
            "0x"
        );
        // Withdraw tokens to L1
        IPolygonLandTunnel(newLandTunnel).batchTransferQuadToL1(
            _ownerWithLandIds.owner,
            _ownerWithLandIds.sizes,
            _ownerWithLandIds.x,
            _ownerWithLandIds.y,
            "0x"
        );

        emit TunnelLandsMigratedWithWithdraw(_ownerWithLandIds);
    }

    ///@dev approves New Land Tunnel to transfer Lands on behalf of this contract
    function approveNewLandTunnel() external {
        polygonLand.setApprovalForAll(newLandTunnel, true);
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

    /// @dev to be called by external contact to check if this contract supports ERC721 token and batch token receive
    /// @param interfaceId the interface to be checked if supported by the contract
    /// 0x5e8bf644 is the interface of IERC721MandatoryTokenReceiver and 0x01ffc9a7 for the Eip 165 supports interface's interface id
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x5e8bf644 || interfaceId == 0x01ffc9a7;
    }
}
