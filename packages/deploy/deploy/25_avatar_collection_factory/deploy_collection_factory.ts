import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const contractName = 'CollectionFactory';
  await deploy(contractName, {
    from: deployer,
    contract: contractName,
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = [
  'CollectionFactory',
  'CollectionFactory_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
