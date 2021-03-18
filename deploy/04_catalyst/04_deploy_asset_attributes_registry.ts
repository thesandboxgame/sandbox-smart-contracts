import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const GemsCatalystsRegistry = await deployments.get('GemsCatalystsRegistry');

  const {deployer, assetAttributesRegistryAdmin} = await getNamedAccounts();
  await deploy(`AssetAttributesRegistry`, {
    from: deployer,
    log: true,
    args: [
      GemsCatalystsRegistry.address,
      assetAttributesRegistryAdmin,
      assetAttributesRegistryAdmin,
      assetAttributesRegistryAdmin,
    ],
  });
};
export default func;
func.tags = ['AssetAttributesRegistry', 'AssetAttributesRegistry_deploy'];
func.dependencies = ['GemsCatalystsRegistry_deploy'];
func.skip = async (hre) => hre.network.name !== 'hardhat'; // disabled for now
