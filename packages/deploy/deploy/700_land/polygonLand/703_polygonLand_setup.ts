import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute} = deployments;
  const {deployer} = await getNamedAccounts();

  const RoyaltyManager = await deployments.get('RoyaltyManager');
  await execute(
    'PolygonLand',
    {from: deployer, log: true},
    'setRoyaltyManager',
    RoyaltyManager.address
  );
};

export default func;
func.tags = ['PolygonLand_setup'];
func.dependencies = ['PolygonLandV3_deploy', 'RoyaltyManager_deploy'];
