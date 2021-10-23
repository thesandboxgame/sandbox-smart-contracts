import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import 'dotenv/config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const polygonSand = await deployments.get('PolygonSand');

  const childChainManager = await deployments.getOrNull('CHILD_CHAIN_MANAGER');
  await deploy('PolygonSandClaim', {
    from: deployer,
    log: true,
    args: [polygonSand.address, childChainManager?.address],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonSandClaim', 'PolygonSandClaim_deploy'];
func.dependencies = ['PolygonSand_deploy'];
