import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from './../../hardhat.config';

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
    metadataUrl = 'https://contracts.sandbox.game/dancefight-unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/dancefight-unrevealed/';
  }

  await deploy('DanceFight', {
    from: deployer,
    contract: 'DanceFight',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'DanceFight',
          'DF',
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
  'DanceFight',
  'DanceFight_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['SandboxForwarder'];
