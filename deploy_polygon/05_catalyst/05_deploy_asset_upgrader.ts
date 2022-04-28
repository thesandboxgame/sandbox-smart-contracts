import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {upgradeFee, gemAdditionFee} from '../../data/assetUpgraderFees';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const AssetAttributesRegistry = await deployments.get(
    'PolygonAssetAttributesRegistry'
  );
  const Sand = await deployments.get('PolygonSand');
  const PolygonAssetERC1155 = await deployments.get('PolygonAssetERC1155');
  const PolygonAssetERC721 = await deployments.get('PolygonAssetERC721');

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
      PolygonAssetERC1155.address,
      PolygonAssetERC721.address,
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
  'PolygonAssetERC1155',
  'PolygonGemsCatalystsRegistry_deploy',
  'TRUSTED_FORWARDER',
];
