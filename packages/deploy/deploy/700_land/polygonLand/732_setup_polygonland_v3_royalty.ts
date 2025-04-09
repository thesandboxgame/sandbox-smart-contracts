import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';
import {
  ROYALTY_MANAGER_POLYGON_LAND_ROYALTY_BPS,
  ROYALTY_MANAGER_TOTAL_BASIS_POINTS,
} from '../../../royaltiesConfig';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {royaltyManagerAdmin, commonRoyaltyReceiver} = await getNamedAccounts();
  const PolygonLand = await deployments.get('PolygonLand');
  // Here we assume a fixed royalty percentage that does not depend on the tokenId
  const info = await read(
    'PolygonLand',
    'royaltyInfo',
    1,
    ROYALTY_MANAGER_TOTAL_BASIS_POINTS
  );
  if (info.receiver != commonRoyaltyReceiver) {
    console.warn(
      `The hardhat.config commonRoyaltyReceiver (${commonRoyaltyReceiver}) is different from the one configured in the royaltyManager (${info.receiver})`
    );
  }
  if (!info.royaltyAmount.eq(ROYALTY_MANAGER_POLYGON_LAND_ROYALTY_BPS)) {
    console.log(
      `Changing land royalty from ${info.royaltyAmount} to ${ROYALTY_MANAGER_POLYGON_LAND_ROYALTY_BPS}`
    );
    await catchUnknownSigner(
      execute(
        'RoyaltyManager',
        {from: royaltyManagerAdmin, log: true},
        'setContractRoyalty',
        PolygonLand.address,
        ROYALTY_MANAGER_POLYGON_LAND_ROYALTY_BPS
      )
    );
  }
};

export default func;
func.tags = [
  'PolygonLand',
  'PolygonLandV3_setup',
  'PolygonRoyaltyManager',
  'PolygonRoyaltyManager_setup_royalty',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
];
func.dependencies = ['PolygonRoyaltyManager_setup'];
