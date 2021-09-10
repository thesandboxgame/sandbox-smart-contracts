import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

// This script can only run after PolygonAvatarTunnel_deploy that must be run on layer2 !!!
const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const avatarTunnel = await deployments.get('AvatarTunnel');
  const polygonAvatarTunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonAvatarTunnel');
  if (!polygonAvatarTunnel) {
    console.warn(
      'Cannot setFxChildTunnel in avatarTunnel, still expect the deployment on L2!!!'
    );
    return;
  }

  await deployments.execute(
    'AvatarTunnel',
    {from: deployer, log: true},
    'setFxChildTunnel',
    polygonAvatarTunnel.address
  );

  // Try to run on something L2 even if the current running deploy is on L1
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();
  await hre.companionNetworks['l2'].deployments.execute(
    'PolygonAvatarTunnel',
    {from: deployerOnL2, log: true},
    'setFxRootTunnel',
    avatarTunnel.address
  );
};

export default func;
func.tags = ['Avatar', 'AvatarTunnel_setup'];
func.dependencies = ['AvatarTunnel_deploy'];
func.skip = skipUnlessTestnet;
