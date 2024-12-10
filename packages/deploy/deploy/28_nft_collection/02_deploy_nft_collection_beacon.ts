import {ZeroAddress} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';
import {
  getEventArgsFromReceipt,
  saveDeployment,
} from '../../utils/hardhatDeployUtils';
import {getNamedAccounts} from 'hardhat';

// hardhat-deploy don't support factory and beacons the way we use it
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const beaconAlias = ethers.encodeBytes32String('nft-collection-v2');
  const implementation = await deployments.get('NFTCollection_Implementation');
  const beaconAddress = await deployments.read(
    'CollectionFactory',
    'aliasToBeacon',
    beaconAlias
  );
  if (beaconAddress == ZeroAddress) {
    await deployments.catchUnknownSigner(
      deployBeacon(hre, beaconAlias, implementation)
    );
  } else {
    await performSanityChecks(hre, beaconAddress, implementation);
  }
};

async function deployBeacon(hre, beaconAlias, implementation) {
  const {deployments, ethers} = hre;
  const {nftCollectionAdmin} = await getNamedAccounts();
  const receipt = await deployments.execute(
    'CollectionFactory',
    {from: nftCollectionAdmin, log: true},
    'deployBeacon',
    implementation.address,
    beaconAlias
  );
  const eventArgs: {beaconAlias: string; beaconAddress: string} =
    getEventArgsFromReceipt(
      await ethers.getContract('CollectionFactory'),
      receipt,
      'BeaconAdded'
    );
  await saveDeployment(
    deployments,
    eventArgs.beaconAddress,
    'NFTCollection_Beacon',
    'UpgradeableBeacon',
    receipt
  );
}

async function performSanityChecks(hre, beaconAddress: string, implementation) {
  const {deployments, ethers} = hre;
  const beaconArtifact = await deployments.getArtifact('UpgradeableBeacon');
  const beacon = await ethers.getContractAt(beaconArtifact.abi, beaconAddress);

  const i = await beacon.implementation();
  if (i != implementation.address) {
    throw new Error(
      'something went wrong: Beacon already deployed but has wrong implementation address, must call updateBeaconImplementation'
    );
  }
  const factory = await deployments.get('CollectionFactory');
  const o = await beacon.owner();
  if (o != factory.address) {
    throw new Error(
      'something went wrong: Beacon already deployed but has wrong owner'
    );
  }
}

export default func;
func.tags = [
  'PolygonNFTCollection',
  'PolygonNFTCollection_Beacon',
  'PolygonNFTCollectionBeacon_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'CollectionFactory_deploy',
  'CollectionFactory_change_admin',
  'PolygonNFTCollectionImplementation_deploy',
];
