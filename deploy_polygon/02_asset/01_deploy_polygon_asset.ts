import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    assetAdmin,
    assetBouncerAdmin,
    assetAttributesRegistryAdmin,
  } = await getNamedAccounts();
  const {deploy, execute} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');
  const AssetAttributesRegistry = await deployments.get(
    'PolygonAssetAttributesRegistry'
  );

  const assetHelperLib = await deploy('AssetHelper', {
    from: deployer,
  });

  const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
    from: deployer,
  });

  const polygonAsset = await deploy('PolygonAsset', {
    from: deployer,
    contract: 'PolygonAssetV2',
    libraries: {
      AssetHelper: assetHelperLib.address,
      ERC1155ERC721Helper: ERC1155ERC721HelperLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          TRUSTED_FORWARDER.address,
          assetAdmin,
          assetBouncerAdmin,
          CHILD_CHAIN_MANAGER.address,
          1,
          AssetAttributesRegistry.address,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });

  await execute(
    'PolygonAssetAttributesRegistry',
    {from: assetAttributesRegistryAdmin, log: true},
    'setOverLayerDepositor',
    polygonAsset.address
  );
};

export default func;
func.tags = ['PolygonAsset', 'PolygonAsset_deploy', 'L2'];
func.dependencies = [
  'TRUSTED_FORWARDER',
  'CHILD_CHAIN_MANAGER',
  'PolygonGems_deploy',
  'PolygonCatalysts_deploy',
  'PolygonAssetAttributesRegistry_deploy',
];
