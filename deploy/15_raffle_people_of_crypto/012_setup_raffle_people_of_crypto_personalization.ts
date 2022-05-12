import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const {get, read, execute, catchUnknownSigner} = deployments;

  const sandContract = await get('Sand');
  const personalization = await read(
    'RafflePeopleOfCrypto',
    'allowedToExecutePersonalization'
  );
  if (personalization !== sandContract.address) {
    const owner = await read('RafflePeopleOfCrypto', 'owner');
    await catchUnknownSigner(
      execute(
        'RafflePeopleOfCrypto',
        {from: owner, log: true},
        'setAllowedExecutePersonalization',
        sandContract.address
      )
    );
  }
};

export default func;
func.tags = [
  'RafflePeopleOfCrypto',
  'RafflePeopleOfCrypto_setup',
  'RafflePeopleOfCrypto_setup_personalization',
];
func.dependencies = ['Sand_deploy', 'RafflePeopleOfCrypto_deploy'];
