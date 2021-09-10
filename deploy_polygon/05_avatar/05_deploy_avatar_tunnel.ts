import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const polygonAvatar = await deployments.get('PolygonAvatar');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXCHILD = await deployments.get('FXCHILD');

  await deployments.deploy('PolygonAvatarTunnel', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [FXCHILD.address, polygonAvatar.address, TRUSTED_FORWARDER.address],
  });
};

export default func;
func.tags = ['PolygonAvatar', 'PolygonAvatarTunnel_deploy'];
func.dependencies = ['PolygonAvatar_deploy', 'FXCHILD', 'TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;
