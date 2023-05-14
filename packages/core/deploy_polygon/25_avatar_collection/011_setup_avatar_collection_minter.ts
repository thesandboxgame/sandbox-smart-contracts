import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('AvatarCollection', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('AvatarCollection', 'owner');
    await catchUnknownSigner(
      execute(
        'AvatarCollection',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'AvatarCollection',
  'AvatarCollection_setup',
  'AvatarCollection_setup_minter',
];
func.dependencies = ['PolygonSand_deploy', 'AvatarCollection_deploy'];
