import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  const setupWaveMaxTokens = await read(
    'RafflePlayboyPartyPeople',
    'waveMaxTokens'
  );
  if (setupWaveMaxTokens.toNumber() === 0) {
    const owner = await read('RafflePlayboyPartyPeople', 'owner');
    const waveType = 0;
    const waveMaxTokens = 500;
    const waveMaxTokensToBuy = 500;
    const waveSingleTokenPrice = (1 * 10 ** 18).toString();
    const contractAddress = '0x0000000000000000000000000000000000000000';
    const erc1155Id = 0;
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeople',
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
  'RafflePlayboyPartyPeople',
  'RafflePlayboyPartyPeople_setup',
  'RafflePlayboyPartyPeople_setup_wave',
];
func.dependencies = ['RafflePlayboyPartyPeople_deploy'];
