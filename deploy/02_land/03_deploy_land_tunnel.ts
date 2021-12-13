import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';
import {ethers} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const Land = await deployments.get('Land');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');

  const LandTunnel = await deploy('LandTunnel', {
    from: deployer,
    contract: 'LandTunnel',
    args: [CHECKPOINTMANAGER.address, FXROOT.address, Land.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const MockLandTunnel = await deploy('MockLandTunnel', {
    from: deployer,
    contract: 'MockLandTunnel',
    args: [CHECKPOINTMANAGER.address, FXROOT.address, Land.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const PolygonLandTunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonLandTunnel');

  if (PolygonLandTunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'PolygonLandTunnel',
      {from: deployer},
      'setFxRootTunnel',
      LandTunnel.address
    );
    await deployments.execute(
      'LandTunnel',
      {from: deployer},
      'setFxChildTunnel',
      PolygonLandTunnel.address
    );
  }

  const MockPolygonLandTunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('MockPolygonLandTunnel');

  if (MockPolygonLandTunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'MockPolygonLandTunnel',
      {from: deployer},
      'setFxRootTunnel',
      MockLandTunnel.address
    );
    await deployments.execute(
      'MockLandTunnel',
      {from: deployer},
      'setFxChildTunnel',
      MockPolygonLandTunnel.address
    );
  }
};

export default func;
func.tags = ['LandTunnel', 'LandTunnel_deploy', 'L1'];
func.dependencies = ['Land', 'FXROOT', 'CHECKPOINTMANAGER'];
func.skip = skipUnlessTestnet;
