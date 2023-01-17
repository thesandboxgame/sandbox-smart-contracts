import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {sandAdmin} = await getNamedAccounts();

  const owner = await read('MadBalls', 'owner');

  if (sandAdmin?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'MadBalls',
        {from: owner, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
};

export default func;
func.tags = ['MadBalls', 'MadBalls_change_admin'];
func.dependencies = ['MadBalls_deploy'];
