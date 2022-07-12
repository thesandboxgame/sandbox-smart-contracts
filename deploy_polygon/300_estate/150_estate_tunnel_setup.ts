import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL1, skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const estateTunnel = await deployments.get('EstateTunnel');
  const polygonEstateTunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonEstateTunnel');
  if (!polygonEstateTunnel) {
    console.warn(
      'Cannot setFxChildTunnel in estateTunnel, still expect the deployment on L2!!!'
    );
    return;
  }

  await deployments.execute(
    'EstateTunnel',
    {from: deployer, log: true},
    'setFxChildTunnel',
    polygonEstateTunnel.address
  );

  // Try to run on something L2 even if the current running deploy is on L1
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();
  await hre.companionNetworks['l2'].deployments.execute(
    'PolygonEstateTunnel',
    {from: deployerOnL2, log: true},
    'setFxRootTunnel',
    estateTunnel.address
  );
};

export default func;
func.tags = ['PolygonEstateTunnel', 'PolygonEstateTunnel_setup'];
func.dependencies = ['PolygonEstate_grant_roles'];
func.skip = async (hre) =>
  (await skipUnlessTestnet(hre)) && (await skipUnlessL1(hre));
