import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const mockPolygonLandTunnel = await deployments.get('MockPolygonLandTunnel');
  const polygonLand = await deployments.get('PolygonLand');
  const mockPolygonLandTunnelV2 = await deployments.get(
    'MockPolygonLandTunnelV2'
  );

  await deploy('MockPolygonLandTunnelMigration', {
    from: deployer,
    contract: 'PolygonLandTunnelMigration',
    args: [
      polygonLand.address,
      mockPolygonLandTunnelV2.address,
      mockPolygonLandTunnel.address,
      deployer,
    ],
    log: true,
  });
};
export default func;
func.tags = ['MockPolygonLandTunnelMigration'];
func.dependencies = [
  'MockPolygonLandTunnel',
  'MockPolygonLandTunnelV2',
  'PolygonLand',
];
func.skip = skipUnlessTest;
