import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let FAKE_POLYGON_SAND = await deployments.getOrNull('FAKE_POLYGON_SAND');
  if (!FAKE_POLYGON_SAND) {
    FAKE_POLYGON_SAND = await deploy('FAKE_POLYGON_SAND', {
      contract: 'FakePolygonSand',
      from: deployer,
      log: true,
    });
  }
};
export default func;
func.tags = ['FAKE_POLYGON_SAND', 'L2'];
func.skip = skipUnlessTestnet;
