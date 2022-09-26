import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const mockLandTunnel = await deployments.get('MockLandTunnel');
  const land = await deployments.get('Land');
  const mockLandTunnelV2 = await deployments.get('MockLandTunnelV2');

  await deploy('MockLandTunnelMigration', {
    from: deployer,
    contract: 'LandTunnelMigration',
    args: [
      land.address,
      mockLandTunnelV2.address,
      mockLandTunnel.address,
      deployer,
    ],
    log: true,
  });
};
export default func;
func.tags = ['MockLandTunnelMigration'];
func.dependencies = ['MockLandTunnel', 'MockLandTunnelV2', 'Land'];
