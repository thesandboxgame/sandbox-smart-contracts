import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import 'dotenv/config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const polygonSand = await deployments.get('PolygonSand');

  await deploy('PolygonSandClaim', {
    from: deployer,
    log: true,
    args: [
      polygonSand.address,
      process.env.FAKE_POLYGON_SAND,
      process.env.DURATION_OF_CLAIM,
    ],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonSandClaim', 'PolygonSandClaim_deploy'];
func.dependencies = ['PolygonSand_deploy'];
