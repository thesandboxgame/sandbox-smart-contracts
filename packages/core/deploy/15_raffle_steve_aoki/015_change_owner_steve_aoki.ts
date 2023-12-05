import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const owner = await read('RaffleSteveAoki', 'owner');

  if (deployer?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'RaffleSteveAoki',
        {from: owner, log: true},
        'transferOwnership',
        deployer
      )
    );
  }
};

export default func;
func.tags = ['RaffleSteveAoki_change_admin'];
func.dependencies = [
  'RaffleSteveAoki_deploy',
  'RaffleSteveAoki_setup_minter',
  'RaffleSteveAoki_setup_wave',
];
