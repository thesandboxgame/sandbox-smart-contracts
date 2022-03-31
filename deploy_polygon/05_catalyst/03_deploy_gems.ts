import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import gems from '../../data/gems';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const GemsCatalystsRegistry = await deployments.get(
    'PolygonGemsCatalystsRegistry'
  );

  const {gemMinter, deployer, upgradeAdmin} = await getNamedAccounts();

  for (const gem of gems) {
    await deploy(`PolygonGem_${gem.symbol}`, {
      contract: 'GemV1',
      from: deployer,
      log: true,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: '__GemV1_init',
          args: [
            `Sandbox ${gem.symbol} Gems`,
            gem.symbol,
            deployer, //trustedforwarder
            gemMinter,
            gem.gemId,
            GemsCatalystsRegistry.address,
          ],
        },
        upgradeIndex: 0,
      },
      skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ['PolygonGems', 'PolygonGems_deploy', 'L2'];
func.dependencies = ['PolygonGemsCatalystsRegistry_deploy'];
