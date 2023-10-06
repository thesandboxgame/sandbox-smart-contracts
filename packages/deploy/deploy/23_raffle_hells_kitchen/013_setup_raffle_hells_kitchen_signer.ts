import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('HellsKitchen', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('HellsKitchen', 'owner');
    await catchUnknownSigner(
      execute(
        'HellsKitchen',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = ['HellsKitchen', 'HellsKitchen_setup', 'HellsKitchen_setup_signer'];
func.dependencies = ['HellsKitchen_deploy'];
