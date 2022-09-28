import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {deployer} = await getNamedAccounts();

  const signer = await read('RaffleCareBears', 'signAddress');
  if (signer !== deployer) {
    const owner = await read('RaffleCareBears', 'owner');
    await catchUnknownSigner(
      execute(
        'RaffleCareBears',
        {from: owner, log: true},
        'setSignAddress',
        deployer
      )
    );
  }
};

export default func;
func.tags = [
  'RaffleCareBears',
  'RaffleCareBears_setup',
  'RaffleCareBears_setup_signer',
];
func.dependencies = ['Sand_deploy', 'RaffleCareBears_deploy'];
