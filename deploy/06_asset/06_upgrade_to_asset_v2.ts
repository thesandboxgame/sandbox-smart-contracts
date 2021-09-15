import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    assetBouncerAdmin,
    assetAdmin,
    upgradeAdmin,
    assetAttributesRegistryAdmin,
  } = await getNamedAccounts();
  const {deploy, execute} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const ERC1155_PREDICATE = await deployments.get('ERC1155_PREDICATE');
  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );

  const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
    from: upgradeAdmin,
  });

  const assetHelperLib = await deploy('AssetHelper', {
    from: upgradeAdmin,
  });

  const asset = await deploy('Asset', {
    from: upgradeAdmin,
    contract: 'AssetV2',
    args: [
      TRUSTED_FORWARDER.address,
      assetAdmin,
      assetBouncerAdmin,
      ERC1155_PREDICATE.address,
      0,
      AssetAttributesRegistry.address,
    ],
    libraries: {
      ERC1155ERC721Helper: ERC1155ERC721HelperLib.address,
      AssetHelper: assetHelperLib.address,
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
          ERC1155_PREDICATE.address,
          0,
        ],
      },
      upgradeIndex: 1,
    },
    log: true,
  });

  await execute(
    'AssetAttributesRegistry',
    {from: assetAttributesRegistryAdmin, log: true},
    'setOverLayerDepositor',
    asset.address
  );
};

export default func;
func.tags = ['Asset', 'AssetV2', 'AssetV2_deploy'];
func.runAtTheEnd = true;
func.dependencies = [
  'Asset_deploy',
  'Asset_setup',
  'AssetMinter_deploy',
  'TRUSTED_FORWARDER',
  'ERC1155_PREDICATE',
  'GemsCatalystsRegistry_setup',
];
func.skip = skipUnlessTestnet;
