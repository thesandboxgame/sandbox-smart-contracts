import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin, treasury, raffleSignWallet} =
    await getNamedAccounts();

  const SandboxForwarder = await deployments.get('SandboxForwarder');

  let metadataUrl;
  if (hre.network.name === 'polygon') {
    metadataUrl = 'https://contracts.sandbox.game/ppp-unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/ppp-unrevealed/';
  }

  await deploy('RafflePlayboyPartyPeople', {
    from: deployer,
    contract: 'PlayboyPartyPeople',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'Playboy Party People',
          'PPP',
          treasury,
          raffleSignWallet,
          SandboxForwarder.address,
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
  'RafflePlayboyPartyPeople',
  'RafflePlayboyPartyPeople_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['SandboxForwarder'];
