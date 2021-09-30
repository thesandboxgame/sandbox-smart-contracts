import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonLand = await deployments.get('PolygonLand');

  const PolygonLandTunnel = await deploy('PolygonLandTunnel', {
    from: deployer,
    contract: 'PolygonLandTunnel',
    args: [FXCHILD.address, PolygonLand.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const LandTunnel = await hre.companionNetworks['l1'].deployments.getOrNull(
    'LandTunnel'
  );
  if (LandTunnel) {
    await hre.companionNetworks['l1'].deployments.execute(
      'LandTunnel',
      {from: deployer},
      'setFxChildTunnel',
      [PolygonLandTunnel.address]
    );
  }
};

export default func;
func.tags = ['PolygonLandTunnel', 'PolygonLandTunnel_deploy', 'L2'];
func.dependencies = ['PolygonLand', 'FXCHILD'];
func.skip = skipUnlessTestnet;
