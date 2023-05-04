import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import catalysts from '../../data/catalysts';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const DefaultAttributes = await deployments.get('PolygonDefaultAttributes');
  const GemsCatalystsRegistry = await deployments.get(
    'PolygonGemsCatalystsRegistry'
  );
  const TRUSTED_FORWARDER_V2 = await deployments.get('TRUSTED_FORWARDER_V2');

  const {catalystAdmin, upgradeAdmin, deployer} = await getNamedAccounts();
  for (const catalyst of catalysts) {
    await deploy(`PolygonCatalyst_${catalyst.symbol}`, {
      contract: 'CatalystV1',
      from: deployer,
      log: true,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OptimizedTransparentProxy',
        execute: {
          methodName: '__CatalystV1_init',
          args: [
            `Sandbox ${catalyst.symbol} Catalysts`, //name
            catalyst.symbol, //symbol
            TRUSTED_FORWARDER_V2.address, //trusted forwarder
            catalystAdmin, //admin
            catalyst.maxGems, //maxGems
            catalyst.catalystId, //catalystId
            DefaultAttributes.address, //attributes
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
func.tags = ['PolygonCatalysts', 'PolygonCatalysts_deploy', 'L2'];
func.dependencies = [
  'PolygonDefaultAttributes_deploy',
  'PolygonGemsCatalystsRegistry_deploy',
];
