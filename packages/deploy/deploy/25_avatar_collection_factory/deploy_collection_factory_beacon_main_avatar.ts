import {EventLog} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const implementationContractName = 'AvatarCollection';
const beaconAlias = 'main-avatar';
// always append with "UpgradeableBeacon"
const deploymentsBeaconName = 'MainAvatarUpgradeableBeacon';
// the same as `skipIfAlreadyDeployed` from deployments deploy but applied to our on-chain logic
const skipIfAlreadyDeployed = true;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, ethers, artifacts} = hre;

  const avatarCollectionImplementationContract = await deployments.get(
    implementationContractName
  );

  const owner = await deployments.read('CollectionFactory', 'owner');
  const factory = await deployments.get('CollectionFactory');
  const factoryContract = await ethers.getContractAt(
    'CollectionFactory',
    factory.address
  );
  const factoryContractAsOwner = factoryContract.connect(
    await ethers.provider.getSigner(owner)
  );
  console.log('CollectionFactory:', await factoryContractAsOwner.getAddress());
  console.log('CollectionFactory owner:', owner);

  // check if particular beacon was already added, if yes, will not add again
  if (skipIfAlreadyDeployed) {
    console.log(
      'skipIfAlreadyDeployed is true: checking if this particular beacon, ' +
        `${deploymentsBeaconName} (alias:${beaconAlias}) was already deployed`
    );
    try {
      const beaconDeployment = await deployments.get(deploymentsBeaconName);
      console.log(
        `Deployment file already exists for ${deploymentsBeaconName}`
      );
      console.log(
        `reusing ${deploymentsBeaconName} at ${beaconDeployment.address}`
      );
      return;
    } catch (e) {
      const errorMessage: string = (e as Error).message;
      console.log(errorMessage);
      console.log('Continuing with deployment');
    }
  }
  const implementationAlias = ethers.encodeBytes32String(beaconAlias);

  // deploying beacon
  let deployTx;
  try {
    deployTx = await factoryContractAsOwner.getFunction('deployBeacon')(
      avatarCollectionImplementationContract.address,
      implementationAlias
    );
  } catch {
    return;
  }

  if (!deployTx) {
    return;
  }

  // get beacon address, for now, the last BeaconAdded holds the address
  const beaconAddedEvents = await factoryContractAsOwner.queryFilter(
    factoryContractAsOwner.filters.BeaconAdded()
  );

  const beaconLog = beaconAddedEvents.slice(-1)[0] as EventLog;
  const beaconAddress = beaconLog.args?.[1];

  console.log(`deployed at ${beaconAddress} (tx: ${deployTx.hash})`);

  // save beacon in deployments
  const beaconContractInterface = await artifacts.readArtifact(
    'UpgradeableBeacon'
  );

  await deployments.save(deploymentsBeaconName, {
    address: beaconAddress,
    abi: beaconContractInterface.abi,
  });

  // sanity check
  const beaconDeployment = await deployments.get(deploymentsBeaconName);
  console.log('Newly launched UpgradeableBeacon:', beaconDeployment.address);

  const beaconContract = new ethers.Contract(
    beaconAddress,
    beaconContractInterface.abi,
    ethers.provider
  );

  console.log(
    'Newly launched UpgradeableBeacon owner:',
    await beaconContract.owner()
  );
};

export default func;
func.tags = [
  'CollectionFactory',
  'CollectionFactory_deploy_beacon_main_avatar',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'CollectionFactory_deploy',
  'CollectionFactory_implementation_AvatarCollection_1_deploy',
];
