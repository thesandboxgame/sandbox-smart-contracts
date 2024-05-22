import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

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
  'L2',
];
func.dependencies = [
  'PolygonLandV3_deploy',
  'RoyaltyManager_deploy',
  'PolygonLand_setup',
];
