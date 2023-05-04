import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  let FXCHILD = await deployments.getOrNull('FXCHILD');
  if (!FXCHILD) {
    FXCHILD = await deploy('FXCHILD', {
      from: deployer,
      contract: 'FakeFxChild',
      log: true,
    });
  }
};
export default func;
func.tags = ['FXCHILD', 'L2'];
func.skip = skipUnlessTest;
