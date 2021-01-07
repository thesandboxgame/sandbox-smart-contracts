import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');

  await deploy('NewAsset', {
    contract: 'Asset',
    from: deployer,
    args: [sandContract.address, deployer, deployer],
    log: true,
    skipIfAlreadyDeployed: true,
    //deterministicDeployment: true, // TODO proxy ? will not be useful as it depends on Sand being also determinsitc. unless proxy
  });
};
export default func;
func.tags = ['NewAsset', 'NewAsset_deploy'];
func.dependencies = ['Sand', 'Sand_deploy'];
