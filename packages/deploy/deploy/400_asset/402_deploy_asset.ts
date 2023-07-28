import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

export const DEFAULT_BPS = 300;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    assetAdmin,
    upgradeAdmin,
    commonRoyaltyReceiver,
    filterOperatorSubscription,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const RoyaltyManager = await deployments.get('RoyaltyManager');

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
          filterOperatorSubscription,
          commonRoyaltyReceiver,
          DEFAULT_BPS,
          RoyaltyManager.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};
export default func;

func.tags = ['Asset', 'Asset_deploy', 'L2'];
func.dependencies = [
  'TRUSTED_FORWARDER_V2',
  'RoyaltyManager_deploy',
  'OperatorFilter_setup',
];
