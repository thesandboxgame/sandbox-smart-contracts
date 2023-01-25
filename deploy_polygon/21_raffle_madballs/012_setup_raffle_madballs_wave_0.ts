import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const setupWaveMaxTokens = await read('MadBalls', 'waveMaxTokens');
  if (setupWaveMaxTokens.toNumber() === 0) {
    const owner = await read('MadBalls', 'owner');
    const waveType = 0;
    const waveMaxTokens = 500;
    const waveMaxTokensToBuy = 500;
    const waveSingleTokenPrice = (1 * 10 ** 18).toString();
    const erc1155Id = 0;
    await catchUnknownSigner(
      execute(
        'MadBalls',
        {from: owner, log: true},
        'setupWave',
        waveType,
        waveMaxTokens,
        waveMaxTokensToBuy,
        waveSingleTokenPrice,
        ethers.constants.AddressZero,
        erc1155Id
      )
    );
  }
};

export default func;
func.tags = ['MadBalls', 'MadBalls_setup', 'MadBalls_setup_wave'];
func.dependencies = ['MadBalls_deploy'];
