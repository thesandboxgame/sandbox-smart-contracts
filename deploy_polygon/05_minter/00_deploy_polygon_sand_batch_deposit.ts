import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const polygonSand = await deployments.get('PolygonSand');

  await deploy('PolygonSandBatchDeposit', {
    from: deployer,
    log: true,
    args: [polygonSand.address],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonSandBatchDeposit'];
func.dependencies = ['PolygonSand_deploy'];
