import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import catalysts from '../../data/catalysts';
import gems from '../../data/gems';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');
  const Sand = await deployments.get('PolygonSand');

  for (const cat of catalysts) {
    const CatDeployment = await deployments.get(
      `PolygonCatalyst_${cat.symbol}`
    );
    await deployments.deploy(`CatalystRewardPool_${cat.symbol}`, {
      from: deployer,
      contract: 'ERC20RewardPoolV2',
      args: [Sand.address, CatDeployment.address, TRUSTED_FORWARDER_V2.address],
      log: true,
      // skipIfAlreadyDeployed: true,
    });
  }

  for (const gem of gems) {
    const GemDeployment = await deployments.get(`PolygonGem_${gem.symbol}`);
    await deployments.deploy(`GemRewardPool_${gem.symbol}`, {
      from: deployer,
      contract: 'ERC20RewardPoolV2',
      args: [Sand.address, GemDeployment.address, TRUSTED_FORWARDER_V2.address],
      log: true,
      // skipIfAlreadyDeployed: true,
    });
  }
};

export default func;
func.tags = ['CatsGemsRewardPool', 'CatsGemsRewardPool_deploy'];
func.dependencies = [
  'TRUSTED_FORWARDER_V2',
  'PolygonSand_deploy',
  'PolygonCatalysts_deploy',
];
