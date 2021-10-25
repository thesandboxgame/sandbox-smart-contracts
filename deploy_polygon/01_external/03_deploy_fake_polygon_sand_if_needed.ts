import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let fakePolygonSand = await deployments.getOrNull('FakePolygonSand');
  if (!fakePolygonSand) {
    fakePolygonSand = await deploy('FakePolygonSand', {
      from: deployer,
      log: true,
    });
  }
};
export default func;
func.tags = ['FakePolygonSand', 'L2'];
func.skip = skipUnlessTestnet;
