import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  const Land = await deployments.get('Land');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  const LandTunnel = await deploy('LandTunnel', {
    from: deployer,
    contract: 'LandTunnel',
    args: [CHECKPOINTMANAGER.address, FXROOT.address, Land.address, TRUSTED_FORWARDER.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const PolygonLandTunnel = await hre.companionNetworks[
    'l2'
  ].deployments.getOrNull('PolygonLandTunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hre.companionNetworks[
    'l2'
  ].getNamedAccounts();

  if (PolygonLandTunnel) {
    await hre.companionNetworks['l2'].deployments.execute(
      'PolygonLandTunnel',
      {from: deployerOnL2},
      'setFxRootTunnel',
      LandTunnel.address
    );
    await deployments.execute(
      'LandTunnel',
      {from: deployer},
      'setFxChildTunnel',
      PolygonLandTunnel.address
    );

    const PolygonLand = await hre.companionNetworks['l2'].deployments.getOrNull(
      'PolygonLand'
    );
    if (PolygonLand) {
      const polygonLandTunnel = await deployments.read(
        'PolygonLand',
        'polygonLandTunnel'
      );

      if (polygonLandTunnel === hre.ethers.constants.AddressZero) {
        await deployments.execute(
          'PolygonLand',
          {from: deployerOnL2},
          'setPolygonLandTunnel',
          PolygonLandTunnel.address
        );
      }
    }
  }
};

export default func;
func.tags = ['LandTunnel', 'LandTunnel_deploy', 'L1'];
func.dependencies = ['Land', 'FXROOT', 'CHECKPOINTMANAGER', 'TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;
