import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('Sand');
  const minter = await read('RaffleSteveAoki', 'allowedToExecuteMint');
  if (minter !== sandContract.address) {
    const owner = await read('RaffleSteveAoki', 'owner');
    await catchUnknownSigner(
      execute(
        'RaffleSteveAoki',
        {from: owner, log: true},
        'setAllowedExecuteMint',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'RaffleSteveAoki',
  'RaffleSteveAoki_setup',
  'RaffleSteveAoki_setup_minter',
];
func.dependencies = ['Sand_deploy', 'RaffleSteveAoki_deploy'];
