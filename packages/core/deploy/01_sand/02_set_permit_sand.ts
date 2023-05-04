import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {log, execute, read} = deployments;

  const permit = await deployments.getOrNull('Permit');
  if (!permit) {
    return;
  }

  const isSandSuperOperator = await read(
    'Sand',
    'isSuperOperator',
    permit.address
  );

  if (!isSandSuperOperator) {
    log('setting Permit as Super Operator for SAND');
    const currentSandAdmin = await read('Sand', 'getAdmin');
    await execute(
      'Sand',
      {from: currentSandAdmin, log: true},
      'setSuperOperator',
      permit.address,
      true
    );
  }
};
export default func;
func.tags = ['Permit', 'Permit_setup'];
func.dependencies = ['Permit_deploy', 'Sand_deploy'];
func.skip = skipUnlessTest; // TODO
