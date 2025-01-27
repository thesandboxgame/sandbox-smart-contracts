import {ZeroAddress} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';
import {saveDeployment} from '../../utils/hardhatDeployUtils';

// usually the deployments are done via defender proposals.
// This step lets us continue the deployment after proposal execution
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
    throw new Error('Beacon deployment missing');
  }
  const d = await deployments.getOrNull('NFTCollection_Beacon');
  if (!d) {
    await saveDeployment(
      deployments,
      beaconAddress,
      'NFTCollection_Beacon',
      '@openzeppelin/contracts-0.8.15/proxy/beacon/UpgradeableBeacon.sol:UpgradeableBeacon',
      undefined,
      undefined,
      [implementation.address]
    );
  }

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
};

export default func;
func.tags = [
  'PolygonNFTCollection',
  'PolygonNFTCollection_Beacon',
  'PolygonNFTCollectionBeacon_check',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['PolygonNFTCollectionBeacon_deploy'];
