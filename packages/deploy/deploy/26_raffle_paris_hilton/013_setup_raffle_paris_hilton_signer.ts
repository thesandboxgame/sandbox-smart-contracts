import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('ParisHilton', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('ParisHilton', 'owner');
    await catchUnknownSigner(
      execute(
        'ParisHilton',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = ['ParisHilton', 'ParisHilton_setup', 'ParisHilton_setup_signer'];
func.dependencies = ['ParisHilton_deploy'];
