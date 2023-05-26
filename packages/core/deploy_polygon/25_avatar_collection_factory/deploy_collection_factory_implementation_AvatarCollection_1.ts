import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

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
];
func.dependencies = ['CollectionFactory_deploy'];
