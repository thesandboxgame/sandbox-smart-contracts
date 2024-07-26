import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {read, execute, catchUnknownSigner} = deployments;

  let sandContractAddress;
  if (hre.network.name === 'polygon') {
    sandContractAddress = '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683';
  } else {
    // hre.network.name === 'mumbai'
    sandContractAddress = '0x592daadC9eA7F56A81De1FD27A723Bd407709c46';
  }

  // const sandContract = await get('PolygonSand');
  const minter = await read('RafflePlayboyPartyPeople', 'allowedToExecuteMint');
  if (minter !== sandContractAddress) {
    const owner = await read('RafflePlayboyPartyPeople', 'owner');
    await catchUnknownSigner(
      execute(
        'RafflePlayboyPartyPeople',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContractAddress
      )
    );
  }
};

export default func;
func.tags = [
  'RafflePlayboyPartyPeople',
  'RafflePlayboyPartyPeople_setup',
  'RafflePlayboyPartyPeople_setup_minter',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
// func.dependencies = ['PolygonSand_deploy', 'RafflePlayboyPartyPeople_deploy'];
func.dependencies = ['RafflePlayboyPartyPeople_deploy'];
