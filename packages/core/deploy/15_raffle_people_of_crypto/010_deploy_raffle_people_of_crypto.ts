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
    metadataUrl = 'https://contracts.sandbox.game/poc-unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/poc-unrevealed/';
  }

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('RafflePeopleOfCrypto', {
    from: deployer,
    contract: 'PeopleOfCryptoGeneric',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          metadataUrl,
          'People Of Crypto',
          'POC',
          treasury,
          raffleSignWallet,
          TRUSTED_FORWARDER.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['RafflePeopleOfCrypto', 'RafflePeopleOfCrypto_deploy'];
func.dependencies = ['TRUSTED_FORWARDER'];
