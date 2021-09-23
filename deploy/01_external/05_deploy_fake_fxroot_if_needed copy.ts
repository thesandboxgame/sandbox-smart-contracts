import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let FXROOT = await deployments.getOrNull('FXROOT');
  if (!FXROOT) {
    FXROOT = await deploy('FXROOT', {
      from: deployer,
      contract: 'FakeFxRoot',
      log: true,
    });
  }
};
export default func;
func.tags = ['FXROOT', 'L1'];
func.skip = skipUnlessTest;
