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
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

  let metadataUrl;
  if (hre.network.name === 'polygon') {
    metadataUrl =
      'https://contracts.sandbox.game/fist-of-the-north-star-unrevealed/';
  } else {
    metadataUrl =
      'https://contracts-demo.sandbox.game/fist-of-the-north-star-unrevealed/';
  }

  await deploy('FistOfTheNorthStar', {
    from: deployer,
    contract: 'FistOfTheNorthStar',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'FistOfTheNorthStar',
          'FOTNS',
          treasury,
          raffleSignWallet,
          TRUSTED_FORWARDER.address,
          defaultOperatorFiltererRegistry,
          defaultOperatorFiltererSubscription,
          true, // we want to subscribe to OpenSea's list
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['FistOfTheNorthStar', 'FistOfTheNorthStar_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
