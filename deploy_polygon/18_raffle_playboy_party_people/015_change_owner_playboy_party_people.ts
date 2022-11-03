import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const owner = await read('RafflePlayboyPartyPeople', 'owner');

  if (deployer?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeople',
        {from: owner, log: true},
        'transferOwnership',
        deployer
      )
    );
  }
};

export default func;
func.tags = ['RafflePlayboyPartyPeople_change_admin'];
func.dependencies = [
  'RafflePlayboyPartyPeople_deploy',
  'RafflePlayboyPartyPeople_setup_minter',
  'RafflePlayboyPartyPeople_setup_wave',
];
