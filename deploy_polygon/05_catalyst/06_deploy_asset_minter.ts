import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import assetMinterCatalystAmounts from '../../data/assetMinterCatalystAmounts';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const AssetAttributesRegistry = await deployments.get(
    'PolygonAssetAttributesRegistry'
  );
  const {deployer, assetMinterAdmin} = await getNamedAccounts();
  const AssetERC1155 = await deployments.get('PolygonAssetERC1155');

  const assetRegistryData = await read(
    'PolygonAssetAttributesRegistry',
    'getCatalystRegistry'
  );

  const commonQuantity = assetMinterCatalystAmounts.commonQuantity;
  const rareQuantity = assetMinterCatalystAmounts.rareQuantity;
  const epicQuantity = assetMinterCatalystAmounts.epicQuantity;
  const legendaryQuantity = assetMinterCatalystAmounts.legendaryQuantity;
  const artQuantity = assetMinterCatalystAmounts.artQuantity;
  const propQuantity = assetMinterCatalystAmounts.propQuantity;

  const assetQuantitiesByCatalystId = [
    commonQuantity,
    rareQuantity,
    epicQuantity,
    legendaryQuantity,
  ];
  const assetQuantitiesByTypeId = [artQuantity, propQuantity];

  await deploy(`PolygonAssetMinter`, {
    from: deployer,
    log: true,
    args: [
      AssetAttributesRegistry.address,
      AssetERC1155.address,
      assetRegistryData,
      assetMinterAdmin,
      TRUSTED_FORWARDER.address,
      assetQuantitiesByCatalystId,
      assetQuantitiesByTypeId,
    ],
    contract: 'AssetMinter',
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonAssetMinter', 'PolygonAssetMinter_deploy', 'L2'];
func.dependencies = [
  'PolygonAssetAttributesRegistry_deploy',
  'PolygonAssetERC1155',
  'TRUSTED_FORWARDER',
  'PolygonAssetERC1155_deploy',
  'PolygonAssetERC721',
];
