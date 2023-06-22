import {ethers, getNamedAccounts, deployments, artifacts} from 'hardhat';
import {withSnapshot} from '../../../utils';
import ERC20Mock from '@openzeppelin/contracts-0.8.15/build/contracts/ERC20PresetMinterPauser.json';
import {assert} from 'chai';
import {Contract} from 'ethers';
export const targetContractName = 'CollectionFactory';

const deployTag = 'CollectionFactory_deploy';

export const randomWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);

export const setupFactory = withSnapshot([deployTag], async function () {
  const factoryContract = await ethers.getContract(targetContractName);

  const owner = await factoryContract.owner();
  const factoryContractAsOwner = await ethers.getContract(
    targetContractName,
    owner
  );

  const randomAddress = randomWallet.address;
  await topUpAddress(randomAddress, 100);

  const factoryContractAsRandomWallet = await ethers.getContract(
    targetContractName,
    randomAddress
  );

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
});

async function deployMockContract(contractName: string) {
  const {deployer} = await getNamedAccounts();

  await deployments.deploy(contractName, {
    from: deployer,
    contract: contractName,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  return await ethers.getContract(contractName);
}

export const setupMockERC20 = withSnapshot([], async function () {
  const {deployer} = await getNamedAccounts();

  await deployments.deploy('RandomToken', {
    from: deployer,
    contract: ERC20Mock,
    args: ['RToken', 'RAND'],
    proxy: false,
  });
  return {
    randomTokenContract: await ethers.getContract('RandomToken', deployer),
  };
});

export async function topUpAddress(
  recipientAddress: string,
  nativeTokenAmount: number
): Promise<void> {
  const signer = ethers.provider.getSigner();

  // Set the amount of ETH to send
  const amountToSend = ethers.utils.parseEther(nativeTokenAmount.toString());

  // Send the transaction
  await signer.sendTransaction({
    to: recipientAddress,
    value: amountToSend,
  });
}

export async function deployBeacon(
  factoryContractAsOwner: Contract,
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
  factoryContractAsOwner: Contract,
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
): Promise<Contract> {
  const {deployer} = await getNamedAccounts();
  const beaconContractName = 'UpgradeableBeacon';
  await deployments.deploy(beaconContractName, {
    from: deployer,
    contract: beaconContractName,
    args: [implementationAddress],
    log: true,
  });

  const contract = await ethers.getContract(beaconContractName);
  if (asOwner) {
    const owner = await contract.owner();
    return await ethers.getContract(beaconContractName, owner);
  }
  return contract;
}

export async function getMockInitializationArgs(
  contract: Contract
): Promise<string> {
  const {deployer} = await getNamedAccounts();
  return contract.interface.encodeFunctionData('initialize', [
    deployer,
    'AvatarCollectionTest',
    deployer,
    randomWallet.address,
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
