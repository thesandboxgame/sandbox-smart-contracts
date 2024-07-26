import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('MadBalls', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('MadBalls', 'owner');
    await catchUnknownSigner(
      execute(
        'MadBalls',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = [
  'MadBalls',
  'MadBalls_setup',
  'MadBalls_setup_signer',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['MadBalls_deploy'];
