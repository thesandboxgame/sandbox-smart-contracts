import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {
  withSnapshot,
  setupUsers,
  setupUser,
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
} from '../../utils';
import {Contract} from 'ethers';

const name = `The Sandbox's ASSETs ERC721`;
const symbol = 'ASSETERC721';

// PolygonAssetERC721 enables minting via MINTER_ROLE only; MINTER_ROLE intended to be granted to:
// Admin (migration), PolygonAssetERC721Tunnel (bridging) and AssetUpgrader contract (extraction).
// Custom tunnel has been selected for several reasons: we need to lock the tokens rather than burn.
// We also want to be able to have batch transfer functionality.
// Minting with metadata must be implemented to retain the metadata hash.

export const setupAssetERC721Test = withSnapshot(
  ['operatorFilterSubscription'],
  async function () {
    const {deployer, upgradeAdmin} = await getNamedAccounts();
    const [
      trustedForwarder,
      adminRole,
      minter,
      other,
      dest,
    ] = await getUnnamedAccounts();
    const OperatorFilterSubscription = await deployments.get(
      'OperatorFilterSubscription'
    );

    await deployments.deploy('PolygonAssetERC721', {
      from: deployer,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            trustedForwarder,
            adminRole,
            OperatorFilterSubscription.address,
          ],
        },
      },
    });
    const polygonAssetERC721 = await ethers.getContract(
      'PolygonAssetERC721',
      deployer
    );
    const polygonAssetERC721AsAdmin = await ethers.getContract(
      'PolygonAssetERC721',
      adminRole
    );

    // Grant roles
    const minterRole = await polygonAssetERC721.MINTER_ROLE();
    await polygonAssetERC721AsAdmin.grantRole(minterRole, minter);
    const polygonAssetERC721AsMinter = await ethers.getContract(
      'PolygonAssetERC721',
      minter
    );
    const polygonAssetERC721AsOther = await ethers.getContract(
      'PolygonAssetERC721',
      other
    );
    const polygonAssetERC721AsTrustedForwarder = await ethers.getContract(
      'PolygonAssetERC721',
      trustedForwarder
    );

    const addMinter = async function (
      adminRole: string,
      assetERC721: Contract,
      addr: string
    ): Promise<void> {
      const assetERC721AsAdmin = await ethers.getContract(
        'AssetERC721',
        adminRole
      );
      const minterRole = await assetERC721.MINTER_ROLE();
      await assetERC721AsAdmin.grantRole(minterRole, addr);
    };

    return {
      symbol,
      name,
      polygonAssetERC721,
      polygonAssetERC721AsAdmin,
      polygonAssetERC721AsMinter,
      polygonAssetERC721AsOther,
      deployer,
      upgradeAdmin,
      trustedForwarder,
      polygonAssetERC721AsTrustedForwarder,
      adminRole,
      minterRole,
      minter,
      other,
      dest,
      addMinter,
    };
  }
);

// For AssetERC721Tunnel there is not a function called `setPolygonAssetERC721Tunnel` (as is the case for LAND).
// Instead, the AssetERC721 contract and the PolygonAssetERC721 contract are setup to grant MINTER_ROLE to the relevant tunnel address.

export const setupAssetERC721Tunnels = deployments.createFixture(
  async function () {
    await deployments.fixture([
      'PolygonAssetERC721',
      'AssetERC721',
      'PolygonAssetERC721Tunnel',
      'AssetERC721Tunnel',
      'FXROOT',
      'FXCHILD',
      'CHECKPOINTMANAGER',
      'MockPolygonAssetERC721Tunnel',
      'MockAssetERC721Tunnel',
    ]);
    const PolygonAssetERC721 = await ethers.getContract('PolygonAssetERC721');
    const AssetERC721 = await ethers.getContract('AssetERC721');
    const PolygonAssetERC721Tunnel = await ethers.getContract(
      'PolygonAssetERC721Tunnel'
    );
    const AssetERC721Tunnel = await ethers.getContract('AssetERC721Tunnel');
    const FxRoot = await ethers.getContract('FXROOT');
    const FxChild = await ethers.getContract('FXCHILD');
    const CheckpointManager = await ethers.getContract('CHECKPOINTMANAGER');
    const MockAssetERC721Tunnel = await ethers.getContract(
      'MockAssetERC721Tunnel'
    );
    const MockPolygonAssetERC721Tunnel = await ethers.getContract(
      'MockPolygonAssetERC721Tunnel'
    );
    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
    const trustedForwarder = await ethers.getContractAt(
      'TestMetaTxForwarder',
      TRUSTED_FORWARDER.address
    );

    const namedAccounts = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();
    const otherAccounts = [...unnamedAccounts];
    const minter = otherAccounts[0];
    otherAccounts.splice(0, 1);

    const users = await setupUsers(otherAccounts, {
      PolygonAssetERC721,
      AssetERC721,
      PolygonAssetERC721Tunnel,
      AssetERC721Tunnel,
      FxRoot,
      FxChild,
      MockAssetERC721Tunnel,
      MockPolygonAssetERC721Tunnel,
    });
    const deployer = await setupUser(namedAccounts.deployer, {
      PolygonAssetERC721,
      AssetERC721,
      PolygonAssetERC721Tunnel,
      AssetERC721Tunnel,
      FxRoot,
      FxChild,
      CheckpointManager,
      MockAssetERC721Tunnel,
      MockPolygonAssetERC721Tunnel,
    });
    const assetAdmin = await setupUser(namedAccounts.assetAdmin, {
      AssetERC721,
      PolygonAssetERC721,
    });
    const upgradeAdmin = await setupUser(namedAccounts.upgradeAdmin, {
      PolygonAssetERC721,
      AssetERC721,
      PolygonAssetERC721Tunnel,
      AssetERC721Tunnel,
      FxRoot,
      FxChild,
      CheckpointManager,
      MockAssetERC721Tunnel,
      MockPolygonAssetERC721Tunnel,
    });

    // Grant MINTER_ROLE to minter for test purposes
    const MINTER_ROLE = await AssetERC721.MINTER_ROLE();
    const POLYGON_MINTER_ROLE = await PolygonAssetERC721.MINTER_ROLE();

    await assetAdmin.AssetERC721.grantRole(MINTER_ROLE, minter);
    await assetAdmin.PolygonAssetERC721.grantRole(POLYGON_MINTER_ROLE, minter);
    const assetMinter = await setupUser(minter, {
      AssetERC721,
      PolygonAssetERC721,
    });

    await deployer.FxRoot.setFxChild(FxChild.address);

    await assetAdmin.PolygonAssetERC721.setTrustedForwarder(
      trustedForwarder.address
    );

    // Grant MINTER_ROLE to tunnels
    await assetAdmin.AssetERC721.grantRole(
      MINTER_ROLE,
      AssetERC721Tunnel.address
    );

    await assetAdmin.PolygonAssetERC721.grantRole(
      POLYGON_MINTER_ROLE,
      PolygonAssetERC721Tunnel.address
    );

    // Grant MINTER_ROLE to MOCK tunnels
    await assetAdmin.AssetERC721.grantRole(
      MINTER_ROLE,
      MockAssetERC721Tunnel.address
    );

    await assetAdmin.PolygonAssetERC721.grantRole(
      POLYGON_MINTER_ROLE,
      MockPolygonAssetERC721Tunnel.address
    );

    // Enable tunnels as MINTER
    const l1PredicateAsMinter = await setupUser(MockAssetERC721Tunnel.address, {
      AssetERC721,
    });

    const l2PredicateAsMinter = await setupUser(
      MockPolygonAssetERC721Tunnel.address,
      {
        PolygonAssetERC721,
      }
    );

    return {
      users,
      deployer,
      assetAdmin,
      assetMinter,
      PolygonAssetERC721,
      AssetERC721,
      PolygonAssetERC721Tunnel,
      AssetERC721Tunnel,
      FxRoot,
      FxChild,
      CheckpointManager,
      MockAssetERC721Tunnel,
      MockPolygonAssetERC721Tunnel,
      trustedForwarder,
      l1PredicateAsMinter,
      l2PredicateAsMinter,
      upgradeAdmin,
    };
  }
);

export const setupOperatorFilter = withSnapshot(
  ['operatorFilterSubscription', 'TRUSTED_FORWARDER', 'CHILD_CHAIN_MANAGER'],
  async function () {
    const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';
    const ipfsHashString =
      '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e';

    const {
      deployer,
      upgradeAdmin,
      assetAdmin,
      assetBouncerAdmin,
    } = await getNamedAccounts();

    const otherAccounts = await getUnnamedAccounts();

    const {deploy} = deployments;

    await deploy('MockMarketPlace1', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy('MockMarketPlace2', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy('MockMarketPlace3', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    await deploy('MockMarketPlace4', {
      from: deployer,
      args: [],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const mockMarketPlace1 = await ethers.getContract('MockMarketPlace1');
    const mockMarketPlace2 = await ethers.getContract('MockMarketPlace2');
    const mockMarketPlace3 = await ethers.getContract('MockMarketPlace3');
    const mockMarketPlace4 = await ethers.getContract('MockMarketPlace4');

    await deploy('MockOperatorFilterRegistry', {
      from: deployer,
      args: [
        defaultSubscription,
        [mockMarketPlace1.address, mockMarketPlace2.address],
      ],
      log: true,
      skipIfAlreadyDeployed: true,
    });
    const operatorFilterRegistry = await ethers.getContract(
      'MockOperatorFilterRegistry'
    );

    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
    const operatorFilterSubscription = await deployments.get(
      'OperatorFilterSubscription'
    );

    const operatorFilterRegistryAsOwner = await operatorFilterRegistry.connect(
      await ethers.getSigner(deployer)
    );
    await operatorFilterRegistryAsOwner.registerAndCopyEntries(
      operatorFilterSubscription.address,
      defaultSubscription
    );

    await deployments.deploy('MockPolygonAssetERC721', {
      from: deployer,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            TRUSTED_FORWARDER.address,
            assetAdmin,
            operatorFilterSubscription.address,
          ],
        },
      },
    });

    const polygonAssetERC721 = await ethers.getContract(
      'MockPolygonAssetERC721'
    );

    const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const assetHelperLib = await deploy('AssetHelper', {
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: true,
    });

    const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');

    await deploy('MockPolygonAssetERC1155', {
      from: deployer,
      libraries: {
        ERC1155ERC721Helper: ERC1155ERC721HelperLib.address,
        AssetHelper: assetHelperLib.address,
      },
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [
            TRUSTED_FORWARDER.address,
            assetAdmin,
            assetBouncerAdmin,
            CHILD_CHAIN_MANAGER.address,
            polygonAssetERC721.address,
            1,
            operatorFilterSubscription.address,
          ],
        },
        upgradeIndex: 0,
      },
      log: true,
    });

    const polygonAssetERC1155 = await ethers.getContract(
      'MockPolygonAssetERC1155'
    );

    async function mintAssetERC1155(
      creator: string,
      packId: number,
      hash: string,
      amount: number,
      owner: string
    ) {
      const receipt = await polygonAssetERC1155.mintWithOutBouncerCheck(
        creator,
        packId,
        hash,
        amount,
        owner,
        '0x'
      );

      const transferEvent = await expectEventWithArgs(
        polygonAssetERC1155,
        receipt,
        'TransferSingle'
      );
      const tokenId = transferEvent.args[3];
      return tokenId;
    }

    async function mintAssetERC721(to: string, id: number) {
      const receipt = await polygonAssetERC721.mintWithOutMinterCheck(to, id);
      const event = await expectEventWithArgsFromReceipt(
        polygonAssetERC721,
        receipt,
        'Transfer'
      );
      const tokenId = event.args[2];
      return {receipt, tokenId};
    }

    const users = await setupUsers(otherAccounts, {
      polygonAssetERC721,
      polygonAssetERC1155,
    });

    await polygonAssetERC1155.setOperatorRegistry(
      operatorFilterRegistry.address
    );

    await polygonAssetERC721.setOperatorRegistry(
      operatorFilterRegistry.address
    );

    await polygonAssetERC1155.registerAndSubscribe(
      operatorFilterSubscription.address
    );

    await polygonAssetERC721.registerAndSubscribe(
      operatorFilterSubscription.address
    );

    return {
      mockMarketPlace1,
      mockMarketPlace2,
      mockMarketPlace3,
      mockMarketPlace4,
      operatorFilterRegistry,
      operatorFilterRegistryAsOwner,
      operatorFilterSubscription,
      polygonAssetERC721,
      polygonAssetERC1155,
      ipfsHashString,
      users,
      mintAssetERC1155,
      mintAssetERC721,
    };
  }
);
