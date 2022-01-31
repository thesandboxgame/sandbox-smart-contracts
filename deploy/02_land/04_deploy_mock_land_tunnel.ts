import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const Land = await deployments.get('Land');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const MockLandTunnel = await deploy('MockLandTunnel', {
    from: deployer,
    contract: 'MockLandTunnel',
    args: [
      CHECKPOINTMANAGER.address,
      FXROOT.address,
      Land.address,
      TRUSTED_FORWARDER.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  const MockPolygonLandTunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('MockPolygonLandTunnel');

  if (MockPolygonLandTunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'MockPolygonLandTunnel',
      {from: deployerOnL2},
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
func.tags = ['MockLandTunnel', 'MockLandTunnel_deploy', 'L1'];
func.dependencies = [
  'LandTunnel',
  'Land',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest;
