import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getUnnamedAccounts} = hre;
  const {execute, read} = deployments;

  const others = await getUnnamedAccounts();
  const dummyMinter = others[4];

  const currentLandAdmin = await read('Land', 'getAdmin');
  await execute(
    'Land',
    {from: currentLandAdmin, log: true},
    'setMinter',
    dummyMinter,
    true
  );
};

export default func;
func.runAtTheEnd = true;
func.tags = ['Land', 'Land_setup'];
func.dependencies = ['Land_deploy'];
func.skip = skipUnlessTest;
