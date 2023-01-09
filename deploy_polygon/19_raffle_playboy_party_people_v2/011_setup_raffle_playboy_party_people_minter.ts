import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read(
    'RafflePlayboyPartyPeopleV2',
    'allowedToExecuteMint'
  );
  if (minter !== sandContract.address) {
    const owner = await read('RafflePlayboyPartyPeopleV2', 'owner');
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeopleV2',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'RafflePlayboyPartyPeopleV2',
  'RafflePlayboyPartyPeopleV2_setup',
  'RafflePlayboyPartyPeopleV2_setup_minter',
];
func.dependencies = ['PolygonSand_deploy', 'RafflePlayboyPartyPeopleV2_deploy'];
