import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('Rabbids', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('Rabbids', 'owner');
    await catchUnknownSigner(
      execute(
        'Rabbids',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = ['Rabbids', 'Rabbids_setup', 'Rabbids_setup_signer'];
func.dependencies = ['Rabbids_deploy'];
