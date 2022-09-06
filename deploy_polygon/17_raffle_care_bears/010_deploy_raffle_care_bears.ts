import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {
    deployer,
    upgradeAdmin,
    treasury,
    raffleSignWallet,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

  let metadataUrl;
  if (hre.network.name === 'mainnet') {
    metadataUrl = 'https://contracts.sandbox.game/carebears-unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/carebears-unrevealed/';
  }

  await deploy('RaffleCareBears', {
    from: deployer,
    contract: 'CareBears',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'Care Bears',
          'CB',
          treasury,
          raffleSignWallet,
          TRUSTED_FORWARDER.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['RaffleCareBears', 'RaffleCareBears_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
