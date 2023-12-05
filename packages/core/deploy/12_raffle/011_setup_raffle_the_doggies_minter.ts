import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('Sand');
  const minter = await read('RaffleTheDoggies', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('RaffleTheDoggies', 'owner');
    await catchUnknownSigner(
      execute(
        'RaffleTheDoggies',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'RaffleTheDoggies',
  'RaffleTheDoggies_setup',
  'RaffleTheDoggies_setup_minter',
];
func.dependencies = ['Sand_deploy', 'RaffleTheDoggies_deploy'];
