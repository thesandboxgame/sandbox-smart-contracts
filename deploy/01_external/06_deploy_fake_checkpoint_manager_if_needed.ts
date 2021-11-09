import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  await deploy('CHECKPOINTMANAGER', {
    from: deployer,
    contract: 'FakeCheckpointManager',
    log: true,
  });
};
export default func;
func.tags = ['CHECKPOINTMANAGER', 'L1'];
func.skip = skipUnlessTest;
