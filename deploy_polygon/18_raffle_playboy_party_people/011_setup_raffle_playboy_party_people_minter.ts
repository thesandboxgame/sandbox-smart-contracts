import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('RafflePlayboyPartyPeople', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('RafflePlayboyPartyPeople', 'owner');
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeople',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'RafflePlayboyPartyPeople',
  'RafflePlayboyPartyPeople_setup',
  'RafflePlayboyPartyPeople_setup_minter',
];
func.dependencies = ['PolygonSand', 'RafflePlayboyPartyPeople_deploy'];
