import { ethers, artifacts } from 'hardhat';
import { assert } from 'chai';
import { BaseContract, Contract, ContractTransactionResponse, parseUnits } from 'ethers';
import { CollectionFactory } from '../../../typechain-types/contracts/proxy/CollectionFactory';
import { UpgradeableBeacon } from '../../../typechain-types/@openzeppelin/contracts-0.8.15/proxy/beacon';
import { deployCollectionFactory } from '../factory';
import { getTestingAccounts, topUpAddressWithETH } from '../fixtures';


export const setupFactory = async () => {
  const { randomWallet } = await getTestingAccounts();

  const {
    collectionFactoryContract,
    collectionFactoryAsOwner,
    factoryOwner
  } = await deployCollectionFactory();

  const owner = factoryOwner;
  const factoryContractAsOwner = collectionFactoryAsOwner

  const randomAddress = randomWallet.address;
  await topUpAddressWithETH(randomAddress, 100);

  const factoryContractAsRandomWallet = collectionFactoryContract.connect(randomWallet);

  const mockUpgradableContract = await deployMockContract('MockUpgradable');
  const mockUpgradableV2Contract = await deployMockContract('MockUpgradableV2');
  const mockImplementationContract = await deployMockContract(
    'MockImplementation'
  );

  return {
    owner,
    randomAddress,
    factoryContractAsOwner,
    factoryContractAsRandomWallet,
    mockUpgradableContract,
    mockUpgradableV2Contract,
    mockImplementationContract,
  };
};

async function deployMockContract(contractName: string) {
  const {deployer} = await getTestingAccounts();
  const genericContract = await ethers.getContractFactory(contractName);    
  return await genericContract.connect(deployer).deploy();
}

export async function deployBeacon(
  factoryContractAsOwner: CollectionFactory,
  address: string,
  alias: string
): Promise<Contract> {
  await factoryContractAsOwner.deployBeacon(address, alias);
  const beaconAddedEvents = await factoryContractAsOwner.queryFilter(
    factoryContractAsOwner.filters.BeaconAdded()
  );

  assert.equal(beaconAddedEvents.length, 1);
  const beaconAddress = beaconAddedEvents[0].args?.[1];

  const contractInterface = await artifacts.readArtifact('UpgradeableBeacon');
  return new ethers.Contract(
    beaconAddress,
    contractInterface.abi,
    ethers.provider
  );
}

export async function deployBeaconEventIndex(
  factoryContractAsOwner: CollectionFactory,
  address: string,
  alias: string,
  index: number
): Promise<Contract> {
  await factoryContractAsOwner.deployBeacon(address, alias);
  const beaconAddedEvents = await factoryContractAsOwner.queryFilter(
    factoryContractAsOwner.filters.BeaconAdded()
  );
  const beaconAddress = beaconAddedEvents[index].args?.[1];

  const contractInterface = await artifacts.readArtifact('UpgradeableBeacon');
  return new ethers.Contract(
    beaconAddress,
    contractInterface.abi,
    ethers.provider
  );
}

export async function createBeaconWithImplementation(
  implementationAddress: string,
  asOwner: boolean
): Promise<UpgradeableBeacon> {
  const {deployer} = await getTestingAccounts();

  const UpgradeableBeacon = await ethers.getContractFactory('UpgradeableBeacon');
  const contract = await UpgradeableBeacon.connect(deployer).deploy(implementationAddress);
  if (asOwner) {
    return contract.connect(deployer);
  }
  return contract;
}

export async function getMockInitializationArgs(
  contract: BaseContract & {
    deploymentTransaction(): ContractTransactionResponse;
} & Omit<BaseContract, keyof BaseContract>
): Promise<string> {
  const {deployer, randomWallet} = await getTestingAccounts();
  return contract.interface.encodeFunctionData('initialize', [
    await deployer.getAddress(),
    'AvatarCollectionTest',
    await deployer.getAddress(),
    await randomWallet.getAddress(),
    true,
    650,
  ]);
}

export async function collectionProxyAsContract(
  address: string
): Promise<Contract> {
  const contractInterface = await artifacts.readArtifact('CollectionProxy');
  return new ethers.Contract(address, contractInterface.abi, ethers.provider);
}
