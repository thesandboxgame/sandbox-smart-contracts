import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const {raffleSignWallet} = await getNamedAccounts();

  const signer = await read('AvatarCollection', 'signAddress');
  if (signer !== raffleSignWallet) {
    const owner = await read('AvatarCollection', 'owner');
    await catchUnknownSigner(
      execute(
        'AvatarCollection',
        {from: owner, log: true},
        'setSignAddress',
        raffleSignWallet
      )
    );
  }
};

export default func;
func.tags = [
  'AvatarCollection',
  'AvatarCollection_setup',
  'AvatarCollection_setup_signer',
];
func.dependencies = ['AvatarCollection_deploy'];
