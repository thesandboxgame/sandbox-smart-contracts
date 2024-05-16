import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, execute} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await deploy('PolygonLand', {
    from: deployer,
    contract: 'PolygonLand',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 2,
    },
    log: true,
  });

  const RoyaltyManager = await deployments.get('RoyaltyManager');
  await execute(
    'PolygonLand',
    {from: deployer, log: true},
    'setRoyaltyManager',
    RoyaltyManager.address
  );
};
export default func;
func.tags = ['PolygonLand', 'PolygonLandV3', 'L2'];
func.dependencies = ['RoyaltyManager_deploy'];
