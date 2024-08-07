import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('RaffleCareBears', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('RaffleCareBears', 'owner');
    await catchUnknownSigner(
      execute(
        'RaffleCareBears',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = [
  'RaffleCareBears',
  'RaffleCareBears_setup',
  'RaffleCareBears_setup_signer',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['RaffleCareBears_deploy'];
