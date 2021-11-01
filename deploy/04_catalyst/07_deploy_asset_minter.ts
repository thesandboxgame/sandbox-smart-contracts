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

  await deploy(`AssetMinter`, {
    from: deployer,
    log: true,
    args: [
      AssetAttributesRegistry.address,
      Asset.address,
      GemsCatalystsRegistry.address,
      assetMinterAdmin,
      TRUSTED_FORWARDER.address,
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
