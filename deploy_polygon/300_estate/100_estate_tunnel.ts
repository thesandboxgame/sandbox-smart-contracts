import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL1, skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const polygonEstate = await deployments.get('PolygonEstate');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXCHILD = await deployments.get('FXCHILD');

  await deployments.deploy('PolygonEstateTunnel', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [FXCHILD.address, polygonEstate.address, TRUSTED_FORWARDER.address],
  });
};
export default func;
func.tags = ['PolygonEstateTunnel', 'PolygonEstateTunnel_deploy'];
func.dependencies = ['PolygonEstate_deploy', 'FXCHILD', 'TRUSTED_FORWARDER'];
func.skip = async (hre) =>
  (await skipUnlessTestnet(hre)) && (await skipUnlessL1(hre));
