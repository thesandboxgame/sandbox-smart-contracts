import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../../hardhat.config';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {sandAdmin} = await getNamedAccounts();
  const RoyaltyManager = await deployments.get('RoyaltyManager');
  const current = await read('PolygonLand', 'getRoyaltyManager');
  if (current != RoyaltyManager.address) {
    await catchUnknownSigner(
      execute(
        'PolygonLand',
        {from: sandAdmin, log: true},
        'setRoyaltyManager',
        RoyaltyManager.address
      )
    );
  }
};

export default func;
func.tags = [
  'PolygonLand',
  'PolygonLandV3_setup',
  'PolygonRoyaltyManager',
  'PolygonRoyaltyManager_setup',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'PolygonLandV3_deploy',
  'RoyaltyManager_deploy',
  'PolygonLand_setup',
];
