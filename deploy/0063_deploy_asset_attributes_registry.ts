import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const GemsAndCatalysts = await deployments.get('GemsAndCatalysts');

  const {deployer, assetAttributesRegistryAdmin} = await getNamedAccounts();
  await deploy(`AssetAttributesRegistry`, {
    from: deployer,
    log: true,
    args: [GemsAndCatalysts.address, assetAttributesRegistryAdmin],
  });
};
export default func;
func.tags = ['AssetAttributesRegistry', 'AssetAttributesRegistry_deploy'];
func.dependencies = ['GemsAndCatalysts_deploy'];
