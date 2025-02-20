import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const ROYALTY_PERCENTAGE = 500;
const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {royaltyManagerAdmin, commonRoyaltyReceiver} = await getNamedAccounts();
  const PolygonLand = await deployments.get('PolygonLand');
  const info = await read('PolygonLand', 'royaltyInfo', 1, 10000);
  if (info.receiver != commonRoyaltyReceiver) {
    console.warn(
      `The hardhat.config commonRoyaltyReceiver (${commonRoyaltyReceiver}) is different from the one configured in the royaltyManager (${info.receiver})`
    );
  }
  if (!info.royaltyAmount.eq(ROYALTY_PERCENTAGE)) {
    console.log(
      `Changing land royalty from ${info.royaltyAmount} to ${ROYALTY_PERCENTAGE}`
    );
    await catchUnknownSigner(
      execute(
        'RoyaltyManager',
        {from: royaltyManagerAdmin, log: true},
        'setContractRoyalty',
        PolygonLand.address,
        ROYALTY_PERCENTAGE
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
