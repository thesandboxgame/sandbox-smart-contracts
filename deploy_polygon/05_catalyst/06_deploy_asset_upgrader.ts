import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';
import {upgradeFee, gemAdditionFee} from '../../data/assetUpgraderFees';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const AssetAttributesRegistry = await deployments.get(
    'PolygonAssetAttributesRegistry'
  );
  const Sand = await deployments.get('PolygonSand');
  const Asset = await deployments.get('PolygonAsset');

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const GemsCatalystsRegistry = await deployments.get(
    'PolygonGemsCatalystsRegistry'
  );

  const {deployer, catalystAssetFeeRecipient} = await getNamedAccounts();

  await deploy(`PolygonAssetUpgrader`, {
    from: deployer,
    log: true,
    args: [
      AssetAttributesRegistry.address,
      Sand.address,
      Asset.address,
      GemsCatalystsRegistry.address,
      upgradeFee,
      gemAdditionFee,
      catalystAssetFeeRecipient,
      TRUSTED_FORWARDER.address,
    ],
    contract: `AssetUpgrader`,
  });
};
export default func;
func.tags = ['PolygonAssetUpgrader', 'PolygonAssetUpgrader_deploy', 'L2'];
func.dependencies = [
  'PolygonAssetAttributesRegistry_deploy',
  'PolygonSand_deploy',
  'PolygonAsset_deploy',
  'PolygonGemsCatalystsRegistry_deploy',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest; // disabled for now
