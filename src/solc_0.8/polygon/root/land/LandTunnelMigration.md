# Audience

Documentation is oriented for auditors, internal developers and external developer contributors.

# Description

LandTunnelMigration contract was written to transfer Land from LandTunnel to LandTunnelV2. This contract would be given super operator role on Land for the migration purpose.

The LandTunnelMigration contract would be used in the following way.

- deployed on ethereum mainnet (After the LandTunnelV2 is deployed)
- Given super operator role on Land
- Migration of Land from LandTunnel to LandTunnelV2
- Super operator role is revoked.

# Functions

Contract functions should respect [order-of-functions solidity style guide](https://docs.soliditylang.org/en/v0.8.17/style-guide.html#order-of-functions)

---

```Solidity
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
    }
```

- contract constructor
- `_landToken`: address of the Land token.
- `_newLandTunnel`: address of the LandTunnelV2.
- `_oldLandTunnel`: address of the LandTunnel.
- `_admin`: admin of the contract.

---

```Solidity
    function migrateLandsToTunnel(uint256[] memory ids) external isAdmin
```

- function to migrate Land from LandTunnel to LandTunnelV2.
- emits `TunnelLandsMigrated` event
- `ids`: array of the Ids of Land to be migrated

---

```Solidity
    function migrateQuadsToTunnel(
        uint256[] memory sizes,
        uint256[] memory x,
        uint256[] memory y
    ) external isAdmin
```

- function to migrate Quads from LandTunnel to LandTunnelV2.
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

- function to change admin for the LandTunnelMigration contract.
- emits `AdminChanged` event
- `_newAdmin` : the new admin for the LandTunnelMigration contract.

---

## Events

Events that are emitted through the lifetime of the contract

```Solidity
    event TunnelLandsMigrated(address indexed oldLandTunnel, address indexed newLandTunnel, uint256[] ids);
```

- Event emitted when Lands are migrated from LandTunnel to LandTunnelV2 .
- emitted when migrateLandsToTunnel is called
- `oldLandTunnel`: address of LandTunnel
- `newLandTunnel`: address of LandTunnelV2
- `ids` : array of ids of Lands that have been migrated.

---- event AdminChanged(address \_newAdmin);

```Solidity
    event TunnelQuadsMigrated(
        address indexed oldLandTunnel,
        address indexed newLandTunnel,
        uint256[] sizes,
        uint256[] x,
        uint256[] y
    );
```

- Event emitted when a Quads are migrated from LandTunnel to LandTunnelV2
- emitted when migrateQuadsToTunnel is called
- `oldLandTunnel`: address of LandTunnel
- `newLandTunnel`: address of LandTunnelV2
- `sizes` : array of sizes of Quads that have been migrated.
- `x` : array of x co-ordinates of Quads that have been migrated.
- `y` : array of y co-ordinates of Quads that have been migrated.

---

```Solidity
    event AdminChanged(address _newAdmin);
```

- Event emitted when admin is changed.
- emitted when change admin is called.
- `_newAdmin`: new admin of the LandTunnelMigrationContract.

---

# Links

Deployment scripts for the contract `LandTunnelMigration.sol` is found in [deploy/02_land/13_deploy_land_tunnel_migration.ts](../../../../../deploy/02_land/13_deploy_land_tunnel_migration.ts).

Testing scripts are found in [test/polygon/land/landMigration.test.ts](../../../../../test/polygon/land/landMigration.test.ts)
