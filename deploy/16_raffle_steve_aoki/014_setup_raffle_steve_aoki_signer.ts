import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {deployer} = await getNamedAccounts();

  const signer = await read('RaffleSteveAoki', 'signAddress');
  if (signer !== deployer) {
    const owner = await read('RaffleSteveAoki', 'owner');
    await catchUnknownSigner(
      execute(
        'RaffleSteveAoki',
        {from: owner, log: true},
        'setSignAddress',
        deployer
      )
    );
  }
};

export default func;
func.tags = [
  'RaffleSteveAoki',
  'RaffleSteveAoki_setup',
  'RaffleSteveAoki_setup_signer',
];
func.dependencies = ['Sand_deploy', 'RaffleSteveAoki_deploy'];
