import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {deployer} = await getNamedAccounts();

  const signer = await read('RafflePlayboyPartyPeople', 'signAddress');
  if (signer !== deployer) {
    const owner = await read('RafflePlayboyPartyPeople', 'owner');
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeople',
        {from: owner, log: true},
        'setSignAddress',
        deployer
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
func.dependencies = ['SandBaseToken', 'RafflePlayboyPartyPeople_deploy'];
