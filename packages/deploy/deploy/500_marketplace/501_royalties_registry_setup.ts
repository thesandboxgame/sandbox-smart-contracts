import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();
  const owner = await read('RoyaltiesRegistry', 'owner');
  if (owner != sandAdmin) {
    await catchUnknownSigner(
      execute(
        'RoyaltiesRegistry',
        {from: owner, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
};

export default func;
func.tags = ['RoyaltiesRegistry', 'RoyaltiesRegistry_setup'];
func.dependencies = ['RoyaltiesRegistry_deploy'];
