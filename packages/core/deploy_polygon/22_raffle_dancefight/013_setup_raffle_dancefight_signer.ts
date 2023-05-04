import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('DanceFight', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('DanceFight', 'owner');
    await catchUnknownSigner(
      execute(
        'DanceFight',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = ['DanceFight', 'DanceFight_setup', 'DanceFight_setup_signer'];
func.dependencies = ['DanceFight_deploy'];
