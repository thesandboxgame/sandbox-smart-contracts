import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

import {upgradeFee, gemAdditionFee} from '../../data/assetUpgraderFees';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const AssetAttributesRegistry = await deployments.get(
    'AssetAttributesRegistry'
  );
<<<<<<< HEAD
  const Sand = await deployments.get('PolygonSand');
=======
  const Sand = await deployments.get('Sand');
>>>>>>> fixes in deployments
  const Asset = await deployments.get('Asset');

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const GemsCatalystsRegistry = await deployments.get('GemsCatalystsRegistry');

  const {deployer, catalystAssetFeeRecipient} = await getNamedAccounts();

<<<<<<< HEAD
  await deploy(`PolygonAssetUpgrader`, {
=======
  await deploy(`AssetUpgrader`, {
>>>>>>> fixes in deployments
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
