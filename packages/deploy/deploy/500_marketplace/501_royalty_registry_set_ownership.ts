import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {deployer, sandAdmin} = await getNamedAccounts();
  const owner = await read('RoyaltiesRegistry', 'owner');
  if (!(owner == sandAdmin)) {
    await catchUnknownSigner(
      execute(
        'RoyaltiesRegistry',
        {from: deployer, log: true},
        'transferOwnership',
        sandAdmin
      )
    );
  }
};

export default func;
func.tags = ['RoyaltiesRegistry', 'RoyaltiesRegistry_owner_setup', 'L2'];
func.dependencies = ['RoyaltiesRegistry_deploy'];
