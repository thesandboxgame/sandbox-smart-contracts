import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

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

  const SandboxForwarder = await deployments.get('SandboxForwarder');

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
          SandboxForwarder.address,
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
func.tags = [
  'FistOfTheNorthStar',
  'FistOfTheNorthStar_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['SandboxForwarder'];
