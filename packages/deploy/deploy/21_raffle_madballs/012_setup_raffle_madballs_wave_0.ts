import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const setupWaveMaxTokens = await read('MadBalls', 'waveMaxTokens');
  if (setupWaveMaxTokens.toNumber() === 0) {
    const owner = await read('MadBalls', 'owner');
    const waveMaxTokens = 500;
    const waveMaxTokensToBuy = 500;
    const waveSingleTokenPrice = (1 * 10 ** 18).toString();
    await catchUnknownSigner(
      execute(
        'MadBalls',
        {from: owner, log: true},
        'setupWave',
        waveMaxTokens,
        waveMaxTokensToBuy,
        waveSingleTokenPrice
      )
    );
  }
};

export default func;
func.tags = [
  'MadBalls',
  'MadBalls_setup',
  'MadBalls_setup_wave',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['MadBalls_deploy'];
