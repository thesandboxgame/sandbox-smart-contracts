import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin, exchangeFeeRecipient} =
    await getNamedAccounts();

  let TRUSTED_FORWARDER = await deployments.getOrNull('TRUSTED_FORWARDER');
  if (!TRUSTED_FORWARDER) {
    TRUSTED_FORWARDER = await deploy('TRUSTED_FORWARDER', {
      from: deployer,
      contract: 'TrustedForwarderMock',
      log: true,
    });
  }
  const orderValidator = await deployments.get('OrderValidator');
  const royaltiesRegistry = await deployments.get('RoyaltiesRegistry');

  // TODO: to be fetched from env?
  const deployMeta = process.env.DEPLOY_META;
  const nativeOrder = process.env.NATIVE_ORDER;
  const metaNative = process.env.META_NATIVE;

  const contract = deployMeta ? 'ExchangeMeta' : 'Exchange';

  await deploy('Exchange', {
    from: deployer,
    contract: `@sandbox-smart-contracts/marketplace/src/exchange/${contract}.sol:${contract}`,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: '__Exchange_init',
        args: [
          TRUSTED_FORWARDER.address,
          0,
          250,
          exchangeFeeRecipient,
          royaltiesRegistry,
          orderValidator.address,
          nativeOrder,
          metaNative,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Exchange', 'Exchange_deploy'];
func.dependencies = ['RoyaltiesRegistry_deploy', 'OrderValidator_deploy'];
