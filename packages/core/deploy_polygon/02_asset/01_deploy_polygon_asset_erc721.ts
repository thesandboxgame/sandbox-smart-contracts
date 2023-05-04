import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, assetAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER_V2 = await deployments.getOrNull(
    'TRUSTED_FORWARDER_V2'
  );
  const OperatorFilterSubscription = await deployments.get(
    'PolygonOperatorFilterSubscription'
  );

  await deploy('PolygonAssetERC721', {
    from: deployer,
    contract: 'PolygonAssetERC721',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          TRUSTED_FORWARDER_V2?.address,
          assetAdmin,
          OperatorFilterSubscription.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = [
  'PolygonAssetERC721',
  'PolygonAssetERC721_deploy',
  'L2',
  'PolygonAsset',
];
func.dependencies = ['TRUSTED_FORWARDER', 'polygonOperatorFilterSubscription'];
func.skip = skipUnlessTestnet;
