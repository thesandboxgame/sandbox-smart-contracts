import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    assetAdmin,
    assetBouncerAdmin,
  } = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const CHILD_CHAIN_MANAGER = await deployments.get('CHILD_CHAIN_MANAGER');
  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );

  const assetHelperLib = await deploy('AssetHelper', {
    from: deployer,
  });

  const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
    from: deployer,
  });

  await deploy('PolygonAsset', {
    from: deployer,
    contract: 'PolygonAssetV2',
    args: [
      TRUSTED_FORWARDER.address,
      assetAdmin,
      assetBouncerAdmin,
      CHILD_CHAIN_MANAGER.address,
      1,
      AssetAttributesRegistry.address,
    ],
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
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['PolygonAsset', 'PolygonAsset_deploy', 'L2'];
func.dependencies = [
  'TRUSTED_FORWARDER',
  'CHILD_CHAIN_MANAGER',
  'GemsCatalystsRegistry_setup',
];
func.skip = skipUnlessTestnet; // TODO: change to skip unless L2
