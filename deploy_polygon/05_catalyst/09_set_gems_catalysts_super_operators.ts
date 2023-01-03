import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read} = deployments;
  const GemsCatalystsRegistry = await deployments.get(
    'PolygonGemsCatalystsRegistry'
  );
  const AssetAttributesRegistry = await deployments.get(
    'PolygonAssetAttributesRegistry'
  );
  const AssetMinter = await deployments.get('PolygonAssetMinter');
  const AssetUpgrader = await deployments.getOrNull('PolygonAssetUpgrader');

  const {
    deployer,
    catalystAdmin,
    gemAdmin,
    gemsCatalystsRegistryAdmin,
  } = await getNamedAccounts();

  const superOperatorRole = await read(
    'PolygonGemsCatalystsRegistry',
    'SUPER_OPERATOR_ROLE'
  );

  const isAssetMinterSuperOperator = await read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    superOperatorRole,
    AssetMinter.address
  );

  let admin = deployer;
  const defaultAdminRole = await read(
    'PolygonGemsCatalystsRegistry',
    'DEFAULT_ADMIN_ROLE'
  );

  const isDeployerAdmin = await read(
    'PolygonGemsCatalystsRegistry',
    'hasRole',
    defaultAdminRole,
    deployer
  );

  if (!isDeployerAdmin) {
    const isNewAdmin = await read(
      'PolygonGemsCatalystsRegistry',
      'hasRole',
      defaultAdminRole,
      gemsCatalystsRegistryAdmin
    );
    if (isNewAdmin) {
      admin = gemsCatalystsRegistryAdmin;
    }
  }

  if (!isAssetMinterSuperOperator) {
    await execute(
      'PolygonGemsCatalystsRegistry',
      {from: admin, log: true},
      'grantRole',
      superOperatorRole,
      AssetMinter.address
    );
  }
  // Set GemsCatalystsRegistry, AssetAttributesRegistry, AssetMinter and AssetUpgrader as catalyst superoperators
  for (const catalyst of catalysts) {
    const isGemsCatalystsRegistrySuperOperator = await read(
      `PolygonCatalyst_${catalyst.symbol}`,
      'hasRole',
      superOperatorRole,
      GemsCatalystsRegistry.address
    );

    if (!isGemsCatalystsRegistrySuperOperator) {
      await execute(
        `PolygonCatalyst_${catalyst.symbol}`,
        {from: catalystAdmin, log: true},
        'grantRole',
        superOperatorRole,
        GemsCatalystsRegistry.address
      );
    }
    const isAssetAttributesRegistrySuperOperator = await read(
      `PolygonCatalyst_${catalyst.symbol}`,
      'hasRole',
      superOperatorRole,
      AssetAttributesRegistry.address
    );

    if (!isAssetAttributesRegistrySuperOperator) {
      await execute(
        `PolygonCatalyst_${catalyst.symbol}`,
        {from: catalystAdmin, log: true},
        'grantRole',
        superOperatorRole,
        AssetAttributesRegistry.address
      );
    }
    const isAssetMinterSuperOperator = await read(
      `PolygonCatalyst_${catalyst.symbol}`,
      'hasRole',
      superOperatorRole,
      AssetMinter.address
    );

    if (!isAssetMinterSuperOperator) {
      await execute(
        `PolygonCatalyst_${catalyst.symbol}`,
        {from: catalystAdmin, log: true},
        'grantRole',
        superOperatorRole,
        AssetMinter.address
      );
    }

    // AssetUpgrader is being deployed later
    if (AssetUpgrader) {
      const isAssetUpgraderSuperOperator = await read(
        `PolygonCatalyst_${catalyst.symbol}`,
        'hasRole',
        superOperatorRole,
        AssetUpgrader.address
      );

      if (!isAssetUpgraderSuperOperator) {
        await execute(
          `PolygonCatalyst_${catalyst.symbol}`,
          {from: catalystAdmin, log: true},
          'grantRole',
          superOperatorRole,
          AssetUpgrader.address
        );
      }
    }
  }
  // Set GemsCatalystsRegistry, AssetAttributesRegistry, AssetMinter and AssetUpgrader as gem superoperators
  for (const gem of gems) {
    const isGemsCatalystsRegistrySuperOperator = await read(
      `PolygonGem_${gem.symbol}`,
      'hasRole',
      superOperatorRole,
      GemsCatalystsRegistry.address
    );

    if (!isGemsCatalystsRegistrySuperOperator) {
      await execute(
        `PolygonGem_${gem.symbol}`,
        {from: gemAdmin, log: true},
        'grantRole',
        superOperatorRole,
        GemsCatalystsRegistry.address
      );
    }
    const isAssetAttributesRegistrySuperOperator = await read(
      `PolygonGem_${gem.symbol}`,
      'hasRole',
      superOperatorRole,
      AssetAttributesRegistry.address
    );

    if (!isAssetAttributesRegistrySuperOperator) {
      await execute(
        `PolygonGem_${gem.symbol}`,
        {from: gemAdmin, log: true},
        'grantRole',
        superOperatorRole,
        AssetAttributesRegistry.address
      );
    }
    const isAssetMinterSuperOperator = await read(
      `PolygonGem_${gem.symbol}`,
      'hasRole',
      superOperatorRole,
      AssetMinter.address
    );

    if (!isAssetMinterSuperOperator) {
      await execute(
        `PolygonGem_${gem.symbol}`,
        {from: gemAdmin, log: true},
        'grantRole',
        superOperatorRole,
        AssetMinter.address
      );
    }

    // AssetUpgrader is being deployed later
    if (AssetUpgrader) {
      const isAssetUpgraderSuperOperator = await read(
        `PolygonGem_${gem.symbol}`,
        'hasRole',
        superOperatorRole,
        AssetUpgrader.address
      );

      if (!isAssetUpgraderSuperOperator) {
        await execute(
          `PolygonGem_${gem.symbol}`,
          {from: gemAdmin, log: true},
          'grantRole',
          superOperatorRole,
          AssetUpgrader.address
        );
      }
    }
  }
};
export default func;
func.runAtTheEnd = true;
func.tags = [
  'PolygonGemsCatalystsRegistry',
  'PolygonGemsCatalystsRegistry_setup',
  'L2',
];
func.dependencies = [
  'PolygonCatalysts_deploy',
  'PolygonGems_deploy',
  'PolygonGemsCatalystsRegistry_deploy',
  'PolygonAssetMinter_deploy',
  'PolygonAssetAttributesRegistry_deploy',
];
