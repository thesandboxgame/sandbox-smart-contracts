import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const owner = await read('RaffleCareBears', 'owner');

  if (deployer?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'RaffleCareBears',
        {from: owner, log: true},
        'transferOwnership',
        deployer
      )
    );
  }
};

export default func;
func.tags = ['RaffleCareBears_change_admin'];
func.dependencies = [
  'RaffleCareBears_deploy',
  'RaffleCareBears_setup_minter',
  'RaffleCareBears_setup_wave',
];
