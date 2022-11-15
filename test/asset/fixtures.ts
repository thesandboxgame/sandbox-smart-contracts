import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {Contract} from 'ethers';
import {
  withSnapshot,
  setupUsers,
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
} from '../utils';

const name = `Sandbox's ASSETs ERC721`;
const symbol = 'ASSETERC721';

export const setupAssetERC721Test = withSnapshot(
  ['operatorFilterSubscription'],
  async function () {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

    await deployments.deploy('AssetERC721', {
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

    const assetERC721AsAdmin = await ethers.getContract(
      'AssetERC721',
      adminRole
    );

    const addMinter = async function (
      adminRole: string,
      assetERC721: Contract,
      addr: string
    ): Promise<void> {
      const minterRole = await assetERC721.MINTER_ROLE();
      await assetERC721AsAdmin.grantRole(minterRole, addr);
    };

    const assetERC721 = await ethers.getContract('AssetERC721', deployer);
    return {
      symbol,
      name,
      assetERC721,
      deployer,
      upgradeAdmin,
      trustedForwarder,
      adminRole,
      minter,
      other,
      dest,
      addMinter,
    };
  }
);

export const setupOperatorFilter = withSnapshot(
  ['operatorFilterSubscription', 'TRUSTED_FORWARDER'],
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

    await deployments.deploy('MockAssetERC721', {
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

    const assetERC721 = await ethers.getContract('MockAssetERC721');

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

    await deploy('MockAssetERC1155', {
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
            assetERC721.address,
            0,
            operatorFilterSubscription.address,
          ],
        },
        upgradeIndex: 0,
      },
      log: true,
    });

    const assetERC1155 = await ethers.getContract('MockAssetERC1155');

    async function mintAssetERC1155(
      creator: string,
      packId: number,
      hash: string,
      amount: number,
      owner: string
    ) {
      const receipt = await assetERC1155.mintWithOutBouncerCheck(
        creator,
        packId,
        hash,
        amount,
        owner,
        '0x'
      );

      const transferEvent = await expectEventWithArgs(
        assetERC1155,
        receipt,
        'TransferSingle'
      );
      const tokenId = transferEvent.args[3];
      return tokenId;
    }

    async function mintAssetERC721(to: string, id: number) {
      const receipt = await assetERC721.mintWithOutMinterCheck(to, id);
      const event = await expectEventWithArgsFromReceipt(
        assetERC721,
        receipt,
        'Transfer'
      );
      const tokenId = event.args[2];
      return {receipt, tokenId};
    }

    const users = await setupUsers(otherAccounts, {assetERC721, assetERC1155});

    await assetERC1155.setOperatorRegistry(operatorFilterRegistry.address);

    await assetERC721.setOperatorRegistry(operatorFilterRegistry.address);

    await assetERC1155.registerAndSubscribe(operatorFilterSubscription.address);

    await assetERC721.registerAndSubscribe(operatorFilterSubscription.address);

    return {
      mockMarketPlace1,
      mockMarketPlace2,
      mockMarketPlace3,
      mockMarketPlace4,
      operatorFilterRegistry,
      operatorFilterRegistryAsOwner,
      operatorFilterSubscription,
      assetERC1155,
      assetERC721,
      ipfsHashString,
      users,
      mintAssetERC1155,
      mintAssetERC721,
    };
  }
);
