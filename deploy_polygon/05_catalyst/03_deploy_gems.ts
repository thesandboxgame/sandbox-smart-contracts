import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import gems from '../../data/gems';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const GemsCatalystsRegistry = await deployments.get(
    'PolygonGemsCatalystsRegistry'
  );

  const {gemMinter, deployer} = await getNamedAccounts();

  for (const gem of gems) {
    await deploy(`PolygonGem_${gem.symbol}`, {
      contract: 'Gem',
      from: deployer,
      log: true,
      args: [
        `Sandbox ${gem.symbol} Gems`,
        gem.symbol,
        gemMinter,
        gem.gemId,
        GemsCatalystsRegistry.address,
      ],
      skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ['PolygonGems', 'PolygonGems_deploy', 'L2'];
func.dependencies = ['PolygonGemsCatalystsRegistry_deploy'];
