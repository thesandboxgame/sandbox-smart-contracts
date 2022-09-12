import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

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
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'PolygonAssetAttributesRegistry',
  'PolygonAssetAttributesRegistry_deploy',
  'L2',
];
func.dependencies = ['PolygonGemsCatalystsRegistry_deploy'];
