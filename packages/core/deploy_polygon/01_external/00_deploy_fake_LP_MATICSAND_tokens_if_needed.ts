import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let FAKE_LP_MATIC_SAND = await deployments.getOrNull('QUICKSWAP_SAND_MATIC');
  if (!FAKE_LP_MATIC_SAND) {
    FAKE_LP_MATIC_SAND = await deploy('QUICKSWAP_SAND_MATIC', {
      from: deployer,
      contract: 'FakeLPSandMatic',
      log: true,
    });
  }
};
export default func;
func.tags = ['QUICKSWAP_SAND_MATIC', 'L2'];
func.skip = skipUnlessTestnet;
