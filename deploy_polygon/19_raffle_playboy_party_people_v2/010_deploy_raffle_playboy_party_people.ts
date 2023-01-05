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
  if (hre.network.name === 'mainnet') {
    metadataUrl = 'https://contracts.sandbox.game/ppp-unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/ppp-unrevealed/';
  }

  await deploy('RafflePlayboyPartyPeopleV2', {
    from: deployer,
    contract: 'PlayboyPartyPeopleV2',
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
          TRUSTED_FORWARDER.address,
          defaultOperatorFiltererRegistry,
          defaultOperatorFiltererSubscription,
          false,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = ['RafflePlayboyPartyPeopleV2', 'RafflePlayboyPartyPeopleV2_deploy'];
func.dependencies = ['TRUSTED_FORWARDER_V2'];
