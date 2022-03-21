import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import catalysts from '../../data/catalysts';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {upgradeAdmin, catalystMinter} = await getNamedAccounts();

  const DefaultAttributes = await deployments.get('DefaultAttributes');
  const GemsCatalystsRegistry = await deployments.get('GemsCatalystsRegistry');

  const {catalystAdmin, deployer} = await getNamedAccounts();

  for (const catalyst of catalysts) {
    console.log(`deploying ${catalyst.symbol}`);
    await deploy(`PolygonCatalyst_${catalyst.symbol}`, {
      from: deployer,
      contract: 'CatalystV1',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        execute: {
          methodName: '__CatalystV1_init',
          args: [
            `Sandbox ${catalyst.symbol} Catalysts`, //name
            catalyst.symbol, //symbol
            catalystAdmin, //trusted forwarder
            catalystMinter, //admin
            catalyst.maxGems, //maxGems
            catalyst.catalystId, //catalystId
            DefaultAttributes.address, //attributes
            //GemsCatalystsRegistry.address,
          ],
        },
        upgradeIndex: 0,
      },
      log: true,
      //skipIfAlreadyDeployed: true,
    });
  }
};
export default func;
func.tags = ['Catalysts', 'Catalysts_deploy', 'L2'];
func.dependencies = [
  'DefaultAttributes_deploy',
  'GemsCatalystsRegistry_deploy',
];
