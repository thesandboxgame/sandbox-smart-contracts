import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const FXCHILD = await deployments.get('FXCHILD');
  const PolygonLand = await deployments.get('PolygonLand');

  const MockPolygonLandTunnel = await deploy('MockPolygonLandTunnel', {
    from: deployer,
    contract: 'PolygonLandTunnel',
    args: [FXCHILD.address, PolygonLand.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  // get deployer on l1
  const {deployer: deployerOnL1} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  const MockLandTunnel = await hre.companionNetworks[
    'l1'
  ].deployments.getOrNull('MockLandTunnel');

  if (MockLandTunnel) {
    await hre.companionNetworks['l1'].deployments.execute(
      'MockLandTunnel',
      {from: deployerOnL1},
      'setFxChildTunnel',
      MockPolygonLandTunnel.address
    );
    await deployments.execute(
      'MockPolygonLandTunnel',
      {from: deployer},
      'setFxRootTunnel',
      MockLandTunnel.address
    );
  }
};

export default func;
func.tags = ['MockPolygonLandTunnel', 'MockPolygonLandTunnel_deploy', 'L2'];
func.dependencies = ['PolygonLand', 'FXCHILD', 'PolygonLandTunnel'];
func.skip = skipUnlessTest;
