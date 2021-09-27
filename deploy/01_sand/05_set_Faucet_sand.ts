import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {log, execute, read} = deployments;

  const faucet = await deployments.getOrNull('Faucet');
  if (!faucet) {
    return;
  }

  const isSandSuperOperator = await read(
    'Sand',
    'isSuperOperator',
    faucet.address
  );

  if (!isSandSuperOperator) {
    log('setting Faucet as Super Operator for SAND');
    const currentSandAdmin = await read('Sand', 'getAdmin');
    await execute(
      'Sand',
      {from: currentSandAdmin, log: true},
      'setSuperOperator',
      faucet.address,
      true
    );
  }
};
export default func;
func.tags = ['Faucet', 'Faucet_setup'];
func.dependencies = ['Faucet_deploy', 'Sand_deploy'];
func.skip = skipUnlessTest; // TODO
