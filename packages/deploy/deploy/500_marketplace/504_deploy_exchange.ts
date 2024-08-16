import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read} = deployments;
  const {deployer, sandAdmin, upgradeAdmin, exchangeFeeRecipient} =
    await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const orderValidator = await deployments.get('OrderValidator');
  const royaltiesRegistry = await deployments.get('RoyaltiesRegistry');

  const newProtocolFeePrimary = 0;
  const newProtocolFeeSecondary = 0;
  const newMatchOrdersLimit = 50;

  console.log('Sand admin original', sandAdmin);

  await deploy('Exchange', {
    from: deployer,
    contract: `@sandbox-smart-contracts/marketplace@1.0.1/contracts/Exchange.sol:Exchange`,
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

  console.log(`_______ Exchange deployed _______`);
  const DEFAULT_ADMIN_ROLE = await read('Exchange', 'DEFAULT_ADMIN_ROLE');
  console.log(await read('Exchange', 'hasRole', DEFAULT_ADMIN_ROLE, sandAdmin));
};
export default func;
func.tags = [
  'Exchange',
  'Exchange_deploy',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'RoyaltiesRegistry_deploy',
  'OrderValidator_deploy',
  'TRUSTED_FORWARDER_V2',
];
