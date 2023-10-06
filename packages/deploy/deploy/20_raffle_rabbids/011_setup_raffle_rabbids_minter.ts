import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('PolygonSand');
  const minter = await read('Rabbids', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('Rabbids', 'owner');
    await catchUnknownSigner(
      execute(
        'Rabbids',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = ['Rabbids', 'Rabbids_setup', 'Rabbids_setup_minter'];
func.dependencies = ['PolygonSand_deploy', 'Rabbids_deploy'];
