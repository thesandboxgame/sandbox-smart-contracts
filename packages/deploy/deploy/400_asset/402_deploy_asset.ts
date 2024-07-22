import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, assetAdmin, upgradeAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const RoyaltyManager = await deployments.get('RoyaltyManager');
  const OperatorFilterAssetSubscription = await deployments.get(
    'OperatorFilterAssetSubscription'
  );

  await deploy('Asset', {
    from: deployer,
    contract: '@sandbox-smart-contracts/asset/contracts/Asset.sol:Asset',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          TRUSTED_FORWARDER.address,
          assetAdmin,
          'ipfs://',
          OperatorFilterAssetSubscription.address,
          RoyaltyManager.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = [
  'Asset',
  'Asset_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'OperatorFilterAssetSubscription_deploy',
  'TRUSTED_FORWARDER_V2',
  'RoyaltyManager_deploy',
];
