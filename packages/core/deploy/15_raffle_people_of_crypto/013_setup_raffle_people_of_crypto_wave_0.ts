import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const setupWaveMaxTokens = await read(
    'RafflePeopleOfCrypto',
    'waveMaxTokens'
  );
  if (setupWaveMaxTokens.toNumber() === 0) {
    const owner = await read('RafflePeopleOfCrypto', 'owner');
    const waveType = 0;
    const waveMaxTokens = 50;
    const waveMaxTokensToBuy = 1;
    const waveSingleTokenPrice = (150 * 10 ** 18).toString();
    const contractAddress = '0x0000000000000000000000000000000000000000';
    const erc1155Id = 0;
    await catchUnknownSigner(
      execute(
        'RafflePeopleOfCrypto',
        {from: owner, log: true},
        'setupWave',
        waveType,
        waveMaxTokens,
        waveMaxTokensToBuy,
        waveSingleTokenPrice,
        contractAddress,
        erc1155Id
      )
    );
  }
};

export default func;
func.tags = [
  'RafflePeopleOfCrypto',
  'RafflePeopleOfCrypto_setup',
  'RafflePeopleOfCrypto_setup_wave',
];
func.dependencies = ['RafflePeopleOfCrypto_deploy'];
