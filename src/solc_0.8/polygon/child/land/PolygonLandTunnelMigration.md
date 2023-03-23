# Audience

Documentation is oriented for auditors, internal developers and external developer contributors.

# Description

PolygonLandTunnelMigration contract was written to transfer Land from PolygonLandTunnel to PolygonLandTunnelV2. This contract would be given super operator role on PolygonLand for the migration purpose.

The PolygonLandTunnelMigration contract would be used in the following way.

- deployed on polygon mainnet (After the PolygonLandTunnelV2 is deployed)
- Given super operator role on PolygonLand
- Migration of Land from PolygonLandTunnel to PolygonLandTunnelV2
- Super operator role is revoked.

# Functions

Contract functions should respect [order-of-functions solidity style guide](https://docs.soliditylang.org/en/v0.8.17/style-guide.html#order-of-functions)

---

```Solidity
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
```

- contract constructor
- `_polygonLand`: address of the PolygonLand token.
- `_newLandTunnel`: address of the PolygonLandTunnelV2.
- `_oldLandTunnel`: address of the PolygonLandTunnel.
- `_admin`: admin of the contract.

---

```Solidity
    function migrateLandsToTunnel(uint256[] memory ids) external isAdmin
```

- function to migrate Land from PolygonLandTunnel to PolygonLandTunnelV2.
- emits `TunnelLandsMigrated` event
- `ids`: array of the Ids of Land to be migrated
- can only be called by contract admin

---

```Solidity
    function migrateToTunnelWithWithdraw(OwnerWithLandIds memory _ownerWithLandIds) external isAdmin
```

- function to migrate and withdraw Lands and Quads from PolygonLandTunnel to PolygonLandTunnelV2. First Lands and Quads are transfered to PolygonLandTunnelMigration then they are withdrawn on L1 via batchTransferQuadToL1.
- emits `TunnelLandsMigratedWithWithdraw` event
- `_ownerWithLandIds`: struct of owner on L1 and there Lands and Quads.

---

```Solidity
    function migrateQuadsToTunnel(
        uint256[] memory sizes,
        uint256[] memory x,
        uint256[] memory y
    ) external isAdmin
```

- function to migrate Quads from PolygonLandTunnel to PolygonLandTunnelV2.
- emits `TunnelQuadsMigrated` event
- `sizes`: array of the sizes of quads to be migrated
- `x`: array of the x co-ordinates of quads to be migrated
- `y`: array of the y co-ordinates of quads to be migrated

_Other observations_

- The length of the sizes, x and y array should be same.
- The Quads would me made with sizes, x's, and y's value at same index.

---

```Solidity
function changeAdmin(address _newAdmin) external isAdmin
```

- function to change admin for the PolygonLandTunnelMigration contract.
- emits `AdminChanged` event
- `_newAdmin` : the new admin for the PolygonLandTunnelMigration contract.

---

```Solidity
    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure override returns (bytes4)
```

- function to call and check if PolygonLandTunnelMigration can handle ERC721 transfered Tokens

---

```Solidity
    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external pure override returns (bytes4)
```

- function to call and check if PolygonLandTunnelMigration can handle ERC721 batch transfered Tokens

---

```Solidity
    function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

- function to what interface are handled by PolygonLandTunnelMigration

---

## Events

Events that are emitted through the lifetime of the contract

```Solidity
    event TunnelLandsMigrated(address indexed oldLandTunnel, address indexed newLandTunnel, uint256[] ids);
```

- Event emitted when Lands are migrated from PolygonLandTunnel to PolygonLandTunnelV2 .
- emitted when migrateLandsToTunnel is called
- `oldLandTunnel`: address of PolygonLandTunnel
- `newLandTunnel`: address of PolygonLandTunnelV2
- `ids` : array of ids of Lands that have been migrated.

---

```Solidity
    event TunnelLandsMigratedWithWithdraw(OwnerWithLandIds _ownerWithLandIds);
```

- Event emitted when Lands and Quads are migrated and with drawn from PolygonLandTunnel via PolygonLandTunnelV2 to L1.
- emitted when migrateToTunnelWithWithdraw is called
- `_ownerWithLandIds`: struct of owner on L1 and there Lands and Quads.

---

```Solidity
    event TunnelQuadsMigrated(
        address indexed oldLandTunnel,
        address indexed newLandTunnel,
        uint256[] sizes,
        uint256[] x,
        uint256[] y
    );
```

- Event emitted when a Quads are migrated from PolygonLandTunnel to PolygonLandTunnelV2
- emitted when migrateQuadsToTunnel is called
- `oldLandTunnel`: address of PolygonLandTunnel
- `newLandTunnel`: address of PolygonLandTunnelV2
- `sizes` : array of sizes of Quads that have been migrated.
- `x` : array of x co-ordinates of Quads that have been migrated.
- `y` : array of y co-ordinates of Quads that have been migrated.

---

```Solidity
    event AdminChanged(address _newAdmin);
```

- Event emitted when admin is changed.
- emitted when change admin is called.
- `_newAdmin`: new admin of the PolygonLandTunnelMigrationContract.

---

# Links

Deployment scripts for the contract `PolygonLandTunnelMigration.sol` is found in [deploy_polygon/04_land/06_deploy_polygon_land_tunnel_migration.ts](../../../../../deploy_polygon/04_land/06_deploy_polygon_land_tunnel_migration.ts).

Testing scripts are found in [test/polygon/land/landMigration.test.ts](../../../../../test/polygon/land/landMigration.test.ts)
