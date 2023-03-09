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

export const setupOperatorFilter = withSnapshot(['Sand'], async function () {
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

  await deploy('OperatorFilterSubscription', {
    from: deployer,
    contract: 'OperatorFilterSubscription',
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

  await deploy('OperatorFiltererLib', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const operatorFiltererLib = await deployments.get('OperatorFiltererLib');

  await deployments.deploy('MockLandV3', {
    from: deployer,
    libraries: {
      OperatorFiltererLib: operatorFiltererLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [sandContract.address, deployer],
      },
    },
  });

  const landV3 = await ethers.getContract('MockLandV3');

  const users = await setupUsers(otherAccounts, {landV3});

  await landV3.setOperatorRegistry(operatorFilterRegistry.address);

  await landV3
    .connect(await ethers.getSigner(deployer))
    .register(
      operatorFilterSubscription.address,
      true,
      operatorFilterRegistry.address
    );

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
  };
});
