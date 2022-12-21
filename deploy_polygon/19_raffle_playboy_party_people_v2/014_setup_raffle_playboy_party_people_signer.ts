import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('RafflePlayboyPartyPeopleV2', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('RafflePlayboyPartyPeopleV2', 'owner');
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeopleV2',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = [
  'RafflePlayboyPartyPeopleV2',
  'RafflePlayboyPartyPeopleV2_setup',
  'RafflePlayboyPartyPeopleV2_setup_signer',
];
func.dependencies = ['RafflePlayboyPartyPeopleV2_deploy'];
