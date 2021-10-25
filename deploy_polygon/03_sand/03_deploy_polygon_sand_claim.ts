import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const polygonSand = await deployments.get('PolygonSand');
  const fakePolygonSand = await deployments.get('FakePolygonSand');

  await deploy('PolygonSandClaim', {
    from: deployer,
    log: true,
    args: [polygonSand.address, fakePolygonSand.address],
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonSandClaim', 'PolygonSandClaim_deploy'];
func.dependencies = ['PolygonSand_deploy'];
