import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const implementationContractName = 'AvatarCollection';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  // deploying the implementation
  await deployments.deploy(implementationContractName, {
    from: deployer,
    contract: implementationContractName,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = [
  'CollectionFactory',
  `CollectionFactory_implementation_AvatarCollection_1_deploy`,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['CollectionFactory_deploy'];
