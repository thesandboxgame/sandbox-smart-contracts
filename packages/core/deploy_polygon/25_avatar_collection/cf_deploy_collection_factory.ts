import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

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
func.tags = ['CollectionFactory', 'CollectionFactory_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
