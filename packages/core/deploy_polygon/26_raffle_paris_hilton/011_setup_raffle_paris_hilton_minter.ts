import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('ParisHilton', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('ParisHilton', 'owner');
    await catchUnknownSigner(
      execute(
        'ParisHilton',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = ['ParisHilton', 'ParisHilton_setup', 'ParisHilton_setup_minter'];
func.dependencies = ['PolygonSand_deploy', 'ParisHilton_deploy'];
