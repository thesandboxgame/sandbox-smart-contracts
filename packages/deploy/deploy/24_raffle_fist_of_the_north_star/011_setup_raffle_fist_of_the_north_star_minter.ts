import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('FistOfTheNorthStar', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('FistOfTheNorthStar', 'owner');
    await catchUnknownSigner(
      execute(
        'FistOfTheNorthStar',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'FistOfTheNorthStar',
  'FistOfTheNorthStar_setup',
  'FistOfTheNorthStar_setup_minter',
];
func.dependencies = ['PolygonSand_deploy', 'FistOfTheNorthStar_deploy'];
