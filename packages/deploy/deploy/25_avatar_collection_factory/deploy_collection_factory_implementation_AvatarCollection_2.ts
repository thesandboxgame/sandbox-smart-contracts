import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const implementationContractName = 'AvatarCollection';

const beaconAlias =
  '0x6d61696e2d617661746172000000000000000000000000000000000000000000';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {deployer, sandAdmin} = await getNamedAccounts();

  // deploying the implementation
  const deployment = await deployments.deploy(implementationContractName, {
    from: deployer,
    contract: implementationContractName,
    log: true,
  });
  console.log('New Implementation', deployment.address);

  const oldImplementation = await read(
    'MainAvatarUpgradeableBeacon',
    'implementation'
  );

  console.log('Old Implementation On Beacon', oldImplementation);

  await catchUnknownSigner(
    execute(
      'CollectionFactory',
      {from: sandAdmin, log: true},
      'updateBeaconImplementation',
      beaconAlias,
      deployment.address
    )
  );

  const implementation = await read(
    'MainAvatarUpgradeableBeacon',
    'implementation'
  );
  console.log('New Implementation On Beacon', implementation);
};

export default func;
func.tags = [
  'CollectionFactory',
  `CollectionFactory_implementation_AvatarCollection_2_deploy`,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['CollectionFactory_deploy'];
