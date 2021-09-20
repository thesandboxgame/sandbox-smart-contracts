import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, read} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );
  const Asset = await deployments.get('PolygonAsset');

  const {deployer, assetMinterAdmin} = await getNamedAccounts();
  const assetRegistryData = await read(
    'Asset',
    'assetRegistryData.assetRegistry'
  );
  console.log(assetRegistryData.address);
  await deploy(`AssetMinter`, {
    from: deployer,
    log: true,
    args: [
      AssetAttributesRegistry.address,
      Asset.address,
      assetRegistryData.address,
      assetMinterAdmin,
      TRUSTED_FORWARDER.address,
    ],
  });
};
export default func;
func.tags = ['AssetMinter', 'AssetMinter_deploy', 'L2'];
func.dependencies = [
  'AssetAttributesRegistry_deploy',
  'PolygonAsset_deploy',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest; // disabled for now
