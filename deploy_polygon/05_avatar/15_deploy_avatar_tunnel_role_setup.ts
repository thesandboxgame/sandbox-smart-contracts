import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

// This script can only run after AvatarTunnel_deploy that must be run on layer1 !!!
const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const polygonAvatarTunnel = await deployments.get('PolygonAvatarTunnel');
  const avatarTunnel = await hre.companionNetworks['l1'].deployments.getOrNull(
    'AvatarTunnel'
  );
  if (!avatarTunnel) {
    console.warn(
      'Cannot setFxRootTunnel in polygonAvatarTunnel, still expect the deployment on L1!!!'
    );
    return;
  }

  await deployments.execute(
    'PolygonAvatarTunnel',
    {from: deployer, log: true},
    'setFxRootTunnel',
    avatarTunnel.address
  );

  // Try to run on something L1 even if the current running deploy is on L2
  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l1'
  ].getNamedAccounts();
  await hre.companionNetworks['l1'].deployments.execute(
    'AvatarTunnel',
    {from: deployerOnL1, log: true},
    'setFxChildTunnel',
    polygonAvatarTunnel.address
  );
};

export default func;
func.tags = ['PolygonAvatar', 'PolygonAvatarTunnel_setup'];
func.dependencies = ['PolygonAvatarTunnel_deploy'];
func.skip = skipUnlessTestnet;
