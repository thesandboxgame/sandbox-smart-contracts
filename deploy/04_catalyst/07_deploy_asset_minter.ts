import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );
  const Asset = await deployments.get('Asset');
  const GemsCatalystsRegistry = await deployments.get('GemsCatalystsRegistry');

  const {deployer, assetMinterAdmin} = await getNamedAccounts();

  const commonQuantity = 1000;
  const rareQuantity = 100;
  const epicQuantity = 10;
  const legendaryQuantity = 1;
  const artQuantity = 1;
  const propQuantity = 10000;

  const assetQuantitiesByCatalystId = [
    commonQuantity,
    rareQuantity,
    epicQuantity,
    legendaryQuantity,
  ];
  const assetQuantitiesByTypeId = [artQuantity, propQuantity];

  await deploy(`AssetMinter`, {
    from: deployer,
    log: true,
    args: [
      AssetAttributesRegistry.address,
      Asset.address,
      GemsCatalystsRegistry.address,
      assetMinterAdmin,
      TRUSTED_FORWARDER.address,
      assetQuantitiesByCatalystId,
      assetQuantitiesByTypeId,
    ],
  });
};
export default func;
func.tags = ['AssetMinter', 'AssetMinter_deploy'];
func.dependencies = [
  'AssetAttributesRegistry_deploy',
  'Asset_deploy',
  'GemsCatalystsRegistry_deploy',
  'TRUSTED_FORWARDER',
];
