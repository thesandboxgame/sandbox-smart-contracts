import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('HellsKitchen', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('HellsKitchen', 'owner');
    await catchUnknownSigner(
      execute(
        'HellsKitchen',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = ['HellsKitchen', 'HellsKitchen_setup', 'HellsKitchen_setup_minter'];
func.dependencies = ['PolygonSand_deploy', 'HellsKitchen_deploy'];
