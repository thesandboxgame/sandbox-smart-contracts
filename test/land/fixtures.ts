import {Contract, ContractReceipt} from 'ethers';
import {withSnapshot, setupUsers, waitFor} from '../utils';
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber} from 'ethers';
export const zeroAddress = '0x0000000000000000000000000000000000000000';
export const setupLandV2 = withSnapshot(
  ['LandV2', 'Land_setup', 'Sand'],
  async function (hre) {
    const landContract = await ethers.getContract('Land');
    const sandContract = await ethers.getContract('Sand');
    const {landAdmin} = await getNamedAccounts();
    await setMinter(landContract)(landAdmin, true);
    return {
      landContract,
      sandContract,
      hre,
      ethers,
      getNamedAccounts,
      mintQuad: mintQuad(landContract),
    };
  }
);

export const setupLand = withSnapshot(['Land', 'Sand'], async function (hre) {
  const landContract = await ethers.getContract('Land');
  const {deploy} = deployments;

  const {landAdmin, deployer} = await getNamedAccounts();

  await deploy('TestERC1155ERC721TokenReceiver', {
    from: deployer,
    contract: 'TestERC1155ERC721TokenReceiver',
    args: [landContract.address, true, true, true, true, false],
    log: true,
  });

  const sandContract = await ethers.getContract('Sand');
  const TestERC1155ERC721TokenReceiver = await ethers.getContract(
    'TestERC1155ERC721TokenReceiver'
  );

  await setMinter(landContract)(landAdmin, true);
  return {
    landContract,
    sandContract,
    hre,
    ethers,
    TestERC1155ERC721TokenReceiver,
    getNamedAccounts,
    mintQuad: mintQuad(landContract),
  };
});

export const setupLandV1 = withSnapshot(
  ['LandV1', 'Land_setup', 'Sand'],
  async function (hre) {
    const landContract = await ethers.getContract('Land');
    const sandContract = await ethers.getContract('Sand');
    const {landAdmin} = await getNamedAccounts();
    await setMinter(landContract)(landAdmin, true);
    return {
      landContract,
      sandContract,
      hre,
      ethers,
      getNamedAccounts,
      mintQuad: mintQuad(landContract),
    };
  }
);

export function mintQuad(landContract: Contract) {
  return async (
    to: string,
    size: number,
    x: number,
    y: number
  ): Promise<ContractReceipt> => {
    const {landAdmin} = await getNamedAccounts();
    const contract = landContract.connect(ethers.provider.getSigner(landAdmin));
    return waitFor(contract.mintQuad(to, size, x, y, '0x'));
  };
}

export function getId(layer: number, x: number, y: number): string {
  const lengthOfId = 64;
  const lengthOfBasicId = BigNumber.from(x + y * 408)._hex.length - 2;
  const lengthOfLayerAppendment = lengthOfId - lengthOfBasicId - 2;
  let layerAppendment = '';
  for (let i = 0; i < lengthOfLayerAppendment; i++) {
    layerAppendment = layerAppendment + '0';
  }
  return (
    `0x0${layer - 1}` +
    layerAppendment +
    BigNumber.from(x + y * 408)._hex.slice(2)
  );
}

export function setMinter(landContract: Contract) {
  return async (to: string, allowed: boolean): Promise<ContractReceipt> => {
    const {landAdmin} = await getNamedAccounts();
    const contract = landContract.connect(ethers.provider.getSigner(landAdmin));
    return waitFor(contract.setMinter(to, allowed));
  };
}

export const setupOperatorFilter = withSnapshot(
  ['Sand', 'TRUSTED_FORWARDER_V2', 'operatorFilterSubscription'],
  async function () {
    const defaultSubscription = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';

    const {deployer, upgradeAdmin} = await getNamedAccounts();

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
    const operatorFilterSubscription = await deployments.get(
      'OperatorFilterSubscription'
    );

    const operatorFilterRegistryAsOwner = operatorFilterRegistry.connect(
      await ethers.getSigner(deployer)
    );
    await operatorFilterRegistryAsOwner.registerAndCopyEntries(
      operatorFilterSubscription.address,
      defaultSubscription
    );

    const sandContract = await deployments.get('Sand');

    await deployments.deploy('MockLandV3', {
      from: deployer,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [sandContract.address, deployer],
        },
      },
    });

    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

    await deployments.deploy('MockPolygonLandV2', {
      from: deployer,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [TRUSTED_FORWARDER.address],
        },
      },
    });

    const landV3 = await ethers.getContract('MockLandV3');

    const polygonLandV2 = await ethers.getContract('MockPolygonLandV2');

    await landV3.setOperatorRegistry(operatorFilterRegistry.address);

    await polygonLandV2.setOperatorRegistry(operatorFilterRegistry.address);

    await landV3
      .connect(await ethers.getSigner(deployer))
      .register(operatorFilterSubscription.address, true);

    await polygonLandV2
      .connect(await ethers.getSigner(deployer))
      .register(operatorFilterSubscription.address, true);

    await deployments.deploy('LandV3', {
      from: deployer,
      contract: 'MockLandV3',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [sandContract.address, deployer],
        },
      },
    });

    await deployments.deploy('PolygonLandV2', {
      from: deployer,
      contract: 'MockPolygonLandV2',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: 'initialize',
          args: [TRUSTED_FORWARDER.address],
        },
      },
    });

    const LandV3WithRegistryNotSet = await ethers.getContract('LandV3');

    const PolygonLandV2WithRegistryNotSet = await ethers.getContract(
      'PolygonLandV2'
    );

    const users = await setupUsers(otherAccounts, {
      landV3,
      polygonLandV2,
      LandV3WithRegistryNotSet,
      PolygonLandV2WithRegistryNotSet,
    });

    return {
      mockMarketPlace1,
      mockMarketPlace2,
      mockMarketPlace3,
      mockMarketPlace4,
      operatorFilterRegistry,
      operatorFilterRegistryAsOwner,
      operatorFilterSubscription,
      landV3,
      users,
      polygonLandV2,
      deployer,
      upgradeAdmin,
      sandContract,
      LandV3WithRegistryNotSet,
      PolygonLandV2WithRegistryNotSet,
    };
  }
);
