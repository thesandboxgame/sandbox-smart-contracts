import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('RafflePlayboyPartyPeople', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('RafflePlayboyPartyPeople', 'owner');
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeople',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = [
  'RafflePlayboyPartyPeople',
  'RafflePlayboyPartyPeople_setup',
  'RafflePlayboyPartyPeople_setup_signer',
];
func.dependencies = ['RafflePlayboyPartyPeople_deploy'];
