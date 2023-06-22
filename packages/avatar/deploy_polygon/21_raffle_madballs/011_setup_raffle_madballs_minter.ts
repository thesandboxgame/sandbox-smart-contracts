import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('MadBalls', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('MadBalls', 'owner');
    await catchUnknownSigner(
      execute(
        'MadBalls',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = ['MadBalls', 'MadBalls_setup', 'MadBalls_setup_minter'];
func.dependencies = ['PolygonSand_deploy', 'MadBalls_deploy'];
