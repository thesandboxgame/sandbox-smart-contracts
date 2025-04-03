import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, upgradeAdmin, exchangeFeeRecipient} =
    await getNamedAccounts();

  const SandboxForwarder = await deployments.get('SandboxForwarder');
  const orderValidator = await deployments.get('OrderValidator');
  const royaltiesRegistry = await deployments.get('RoyaltiesRegistry');

  const newProtocolFeePrimary = 0;
  const newProtocolFeeSecondary = 0;
  const newMatchOrdersLimit = 50;

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
          SandboxForwarder.address,
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
  'SandboxForwarder',
];
