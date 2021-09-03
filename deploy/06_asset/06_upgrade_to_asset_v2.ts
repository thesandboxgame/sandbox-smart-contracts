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
  } = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const ERC1155_PREDICATE = await deployments.get('ERC1155_PREDICATE');

  const ERC1155ERC721HelperLib = await deploy('ERC1155ERC721Helper', {
    from: upgradeAdmin,
  });

  await deploy('Asset', {
    from: upgradeAdmin,
    contract: 'AssetV2',
    libraries: {
      ERC1155ERC721Helper: ERC1155ERC721HelperLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initV2',
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

  console.log('Asset upgraded to AssetV2');
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
];
func.skip = skipUnlessTestnet;
