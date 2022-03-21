import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import catalysts from '../../data/catalysts';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {upgradeAdmin} = await getNamedAccounts();

  const DefaultAttributes = await deployments.get('DefaultAttributes');
  const GemsCatalystsRegistry = await deployments.get('GemsCatalystsRegistry');

  const {catalystAdmin, deployer} = await getNamedAccounts();
  for (const catalyst of catalysts) {
    console.log('is it working here');
    await deploy(`Catalyst_${catalyst.symbol}`, {
      contract: 'CatalystV1',
      from: deployer,
      log: true,
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: '__CatalystV1_init',
          args: [
            `Sandbox ${catalyst.symbol} Catalysts`,
            catalyst.symbol,
            catalystAdmin,
            catalyst.maxGems,
            catalyst.catalystId,
            DefaultAttributes.address,
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
func.tags = ['Catalysts', 'Catalysts_deploy', 'L2'];
func.dependencies = [
  'DefaultAttributes_deploy',
  'GemsCatalystsRegistry_deploy',
];
