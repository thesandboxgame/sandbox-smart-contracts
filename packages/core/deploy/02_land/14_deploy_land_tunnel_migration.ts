import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer} = await getNamedAccounts();

  const landTunnel = await deployments.get('LandTunnel');
  const land = await deployments.get('Land');
  const landTunnelV2 = await deployments.get('LandTunnelV2');

  await deploy('LandTunnelMigration', {
    from: deployer,
    contract: 'LandTunnelMigration',
    args: [land.address, landTunnelV2.address, landTunnel.address, deployer],
    log: true,
  });
};
export default func;
func.tags = ['LandTunnelMigration'];
func.dependencies = ['LandTunnel', 'LandTunnelV2', 'Land'];
