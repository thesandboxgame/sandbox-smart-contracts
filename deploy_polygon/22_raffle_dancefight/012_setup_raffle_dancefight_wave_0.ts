import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const setupWaveMaxTokens = await read('DanceFight', 'waveMaxTokens');
  if (setupWaveMaxTokens.toNumber() === 0) {
    const owner = await read('DanceFight', 'owner');
    const waveMaxTokens = 500;
    const waveMaxTokensToBuy = 500;
    const waveSingleTokenPrice = (1 * 10 ** 18).toString();
    await catchUnknownSigner(
      execute(
        'DanceFight',
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
func.tags = ['DanceFight', 'DanceFight_setup', 'DanceFight_setup_wave'];
func.dependencies = ['DanceFight_deploy'];
