import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const polygonSand = await deployments.get('PolygonSand');
  const FAKE_POLYGON_SAND = await deployments.get('FAKE_POLYGON_SAND');

  await deploy('PolygonSandClaim', {
    from: deployer,
    log: true,
    args: [polygonSand.address, FAKE_POLYGON_SAND.address],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonSandClaim', 'PolygonSandClaim_deploy', 'L2'];
func.dependencies = ['PolygonSand_deploy', 'FAKE_POLYGON_SAND'];
