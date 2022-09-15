import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {gemAdditionFee, upgradeFee} from '../../data/assetUpgraderFees';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getChainId} = hre;
  const {deploy, execute, read} = deployments;

  const PolygonSand = await deployments.get('PolygonSand');
  const PolygonAssetERC1155 = await deployments.get('PolygonAssetERC1155');
  const PolygonAssetERC721 = await deployments.get('PolygonAssetERC721');

  const GemsCatalystsRegistry = await deployments.get(
    'PolygonGemsCatalystsRegistry'
  );

  const {deployer, assetAttributesRegistryAdmin} = await getNamedAccounts();
  const BURN_ADDRESS = '0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF';

  // @note For testing fee-burning only
  const chainId = await getChainId();
  if (chainId == '31337') {
    await deploy(`MockAssetAttributesRegistry`, {
      from: deployer,
      log: true,
      args: [
        GemsCatalystsRegistry.address,
        assetAttributesRegistryAdmin,
        assetAttributesRegistryAdmin,
        assetAttributesRegistryAdmin,
      ],
    });

    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
    const MockAssetAttributesRegistry = await deployments.get(
      'MockAssetAttributesRegistry'
    );
    await deploy(`PolygonAssetUpgraderFeeBurner`, {
      from: deployer,
      contract: 'AssetUpgraderFeeBurner',
      log: true,
      args: [
        MockAssetAttributesRegistry.address,
        PolygonSand.address,
        PolygonAssetERC721.address,
        PolygonAssetERC1155.address,
        GemsCatalystsRegistry.address,
        upgradeFee,
        gemAdditionFee,
        BURN_ADDRESS,
        TRUSTED_FORWARDER.address,
      ],
      skipIfAlreadyDeployed: true,
    });

    const upgraderFeeBurner = await deployments.get(
      'PolygonAssetUpgraderFeeBurner'
    );

    // PolygonSand uses admin
    const currentSandAdmin = await read('PolygonSand', 'getAdmin');
    await execute(
      'PolygonSand',
      {from: currentSandAdmin, log: true},
      'setSuperOperator',
      upgraderFeeBurner.address,
      true
    );

    // 'PolygonGemsCatalystsRegistry' uses DEFAULT_ADMIN_ROLE
    const adminRole = await read(
      'PolygonGemsCatalystsRegistry',
      'DEFAULT_ADMIN_ROLE'
    );

    const isGemsCatalystsRegistryAdmin = await read(
      'PolygonGemsCatalystsRegistry',
      'hasRole',
      adminRole,
      upgraderFeeBurner.address
    );

    if (!isGemsCatalystsRegistryAdmin) {
      await execute(
        'PolygonGemsCatalystsRegistry',
        {from: deployer, log: true},
        'grantRole',
        adminRole,
        upgraderFeeBurner.address
      );
    }
  }
};
export default func;
func.tags = [
  'PolygonAssetUpgraderFeeBurner',
  'PolygonAssetUpgraderFeeBurner_deploy',
  'PolygonAssetUpgraderFeeBurner_setup',
];
func.dependencies = [
  'PolygonAssetAttributesRegistry_deploy',
  'PolygonSand_deploy',
  'PolygonAssetERC1155_deploy',
  'PolygonGemsCatalystsRegistry_deploy',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest;
