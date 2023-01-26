import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('DanceFight', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('DanceFight', 'owner');
    await catchUnknownSigner(
      execute(
        'DanceFight',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = ['DanceFight', 'DanceFight_setup', 'DanceFight_setup_minter'];
func.dependencies = ['PolygonSand_deploy', 'DanceFight_deploy'];
