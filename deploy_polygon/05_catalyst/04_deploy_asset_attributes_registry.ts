import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const GemsCatalystsRegistry = await deployments.get(
    'PolygonGemsCatalystsRegistry'
  );

  const {deployer, assetAttributesRegistryAdmin} = await getNamedAccounts();
  await deploy(`PolygonAssetAttributesRegistry`, {
    from: deployer,
    log: true,
    args: [
      GemsCatalystsRegistry.address,
      assetAttributesRegistryAdmin,
      assetAttributesRegistryAdmin,
      assetAttributesRegistryAdmin,
    ],
    contract: 'AssetAttributesRegistry',
  });
};
export default func;
func.tags = [
  'PolygonAssetAttributesRegistry',
  'PolygonAssetAttributesRegistry_deploy',
  'L2',
];
func.dependencies = ['PolygonGemsCatalystsRegistry_deploy'];
