import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, upgradeAdmin, exchangeFeeRecipient} =
    await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const orderValidator = await deployments.get('OrderValidator');
  const royaltiesRegistry = await deployments.get('RoyaltiesRegistry');

  const newProtocolFeePrimary = 0;
  const newProtocolFeeSecondary = 0;
  const newMatchOrdersLimit = 50;

  await deploy('Exchange', {
    from: deployer,
    contract: `@sandbox-smart-contracts/marketplace/contracts/Exchange.sol:Exchange`,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          sandAdmin,
          TRUSTED_FORWARDER.address,
          newProtocolFeePrimary,
          newProtocolFeeSecondary,
          exchangeFeeRecipient,
          royaltiesRegistry.address,
          orderValidator.address,
          newMatchOrdersLimit,
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
func.dependencies = [
  'RoyaltiesRegistry',
  'OrderValidator',
  'TRUSTED_FORWARDER_V2',
];
