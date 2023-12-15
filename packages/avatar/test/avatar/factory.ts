import {ethers} from 'hardhat';
import {expect} from 'chai';
import {CollectionFactory} from '../../typechain-types/contracts/proxy/CollectionFactory';
import {AvatarCollection} from '../../typechain-types/contracts/avatar/AvatarCollection';
import {ContractTransactionResponse} from 'ethers/lib.commonjs/contract';
import {getTestingAccounts} from './fixtures';

export async function deployCollectionFactory() {
  const {deployer: factoryOwner} = await getTestingAccounts();
  const CollectionFactory = await ethers.getContractFactory(
    'CollectionFactory'
  );
  const collectionFactoryContract = await CollectionFactory.connect(
    factoryOwner
  ).deploy();

  expect(await collectionFactoryContract.owner()).to.equal(
    factoryOwner.address
  );

  const collectionFactoryAsOwner =
    collectionFactoryContract.connect(factoryOwner);

  return {
    collectionFactoryContract,
    collectionFactoryAsOwner,
    factoryOwner,
  };
}

export async function deployAvatarImplementation() {
  const {randomWallet} = await getTestingAccounts();

  const AvatarCollection = await ethers.getContractFactory('AvatarCollection');
  const avatarCollectionContract = await AvatarCollection.deploy();

  // implementation has disable initializers and uses upgradable, it should not have an owner
  expect(await avatarCollectionContract.owner()).to.equal(ethers.ZeroAddress);

  const avatarCollectionAsRandomWallet =
    avatarCollectionContract.connect(randomWallet);

  return {
    avatarCollectionContract,
    avatarCollectionAsRandomWallet,
    randomWallet,
  };
}

export async function deployBeaconWithImplementation(
  collectionFactoryAsOwner: CollectionFactory,
  avatarCollectionContract: AvatarCollection & {
    deploymentTransaction(): ContractTransactionResponse;
  },
  beaconAlias: string
) {
  const implementationAlias = ethers.encodeBytes32String(beaconAlias);

  // deploying beacon
  const deployTx = await collectionFactoryAsOwner.deployBeacon(
    await avatarCollectionContract.getAddress(),
    implementationAlias
  );
  await deployTx.wait(); // a must

  // get beacon address, for now, the last BeaconAdded holds the address
  const beaconAddedEvents = await collectionFactoryAsOwner.queryFilter(
    collectionFactoryAsOwner.filters.BeaconAdded()
  );

  const beaconAddress = beaconAddedEvents.slice(-1)[0].args?.[1];

  // console.log(`Newly launched UpgradeableBeacon at ${beaconAddress} (tx: ${deployTx.hash})`);

  return beaconAddress;
}

export async function setupCollectionFactory() {
  const {collectionFactoryContract, collectionFactoryAsOwner, factoryOwner} =
    await deployCollectionFactory();
  const {
    avatarCollectionContract,
    avatarCollectionAsRandomWallet,
    randomWallet,
  } = await deployAvatarImplementation();

  const beaconAlias = 'main-avatar';
  const beaconAddress = await deployBeaconWithImplementation(
    collectionFactoryAsOwner,
    avatarCollectionContract,
    beaconAlias
  );

  return {
    collectionFactoryContract,
    collectionFactoryAsOwner,
    factoryOwner,
    avatarCollectionContract,
    avatarCollectionAsRandomWallet,
    randomWallet,
    beaconAddress,
  };
}
