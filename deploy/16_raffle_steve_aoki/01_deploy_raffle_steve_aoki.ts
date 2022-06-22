import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    upgradeAdmin,
    treasury,
    raffleSignWallet,
  } = await getNamedAccounts();

  let metadataUrl;
  if (hre.network.name === 'mainnet') {
    metadataUrl = 'https://contracts.sandbox.game/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/';
  }

  await deploy('RaffleSteveAoki', {
    from: deployer,
    contract: 'SteveAoki',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [metadataUrl, 'Steve Aoki', 'SA', treasury, raffleSignWallet],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['RaffleSteveAoki', 'RaffleSteveAoki_deploy'];
