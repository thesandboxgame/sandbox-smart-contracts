import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const polygonLandTunnel = await deployments.get('PolygonLandTunnel');
  const polygonLand = await deployments.get('PolygonLand');
  const polygonLandTunnelV2 = await deployments.get('PolygonLandTunnelV2');

  await deploy('PolygonLandTunnelMigration', {
    from: deployer,
    contract: 'PolygonLandTunnelMigration',
    args: [
      polygonLand.address,
      polygonLandTunnelV2.address,
      polygonLandTunnel.address,
      deployer,
    ],
    log: true,
  });
};
export default func;
func.tags = ['PolygonLandTunnelMigration'];
func.dependencies = ['PolygonLandTunnel', 'PolygonLandTunnelV2', 'PolygonLand'];
