import {ZeroAddress} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';
import {
  getEventArgsFromReceipt,
  saveDeployment,
} from '../../utils/hardhatDeployUtils';
import {getNamedAccounts} from 'hardhat';

// hardhat-deploy don't support factory and beacons the way we use them
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers} = hre;
  const {nftCollectionAdmin} = await getNamedAccounts();
  const beaconAlias = ethers.encodeBytes32String('nft-collection-v2');
  const implementation = await deployments.get('NFTCollection_Implementation');
  const beaconAddress = await deployments.read(
    'CollectionFactory',
    'aliasToBeacon',
    beaconAlias
  );
  if (beaconAddress == ZeroAddress) {
    await deployments.catchUnknownSigner(async () => {
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
    });
  }
};

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
