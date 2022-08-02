import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {constants} from 'ethers';
import {skipUnlessTest} from '../../utils/network';

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
    args: [
      CHECKPOINTMANAGER.address,
      FXROOT.address,
      Land.address,
      TRUSTED_FORWARDER.address,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const hreL2 = hre.companionNetworks.l2;
  const deploymentsL2 = hreL2.deployments;
  const PolygonLandTunnel = await deploymentsL2.getOrNull('PolygonLandTunnel');

  // get deployer on l2
  const {deployer: deployerOnL2} = await hreL2.getNamedAccounts();

  if (PolygonLandTunnel) {
    const fxRootTunnel = await deploymentsL2.read(
      'PolygonLandTunnel',
      'fxRootTunnel'
    );
    if (
      fxRootTunnel !== LandTunnel.address &&
      fxRootTunnel == constants.AddressZero
    ) {
      await deploymentsL2.execute(
        'PolygonLandTunnel',
        {from: deployerOnL2},
        'setFxRootTunnel',
        LandTunnel.address
      );
    }
    const fxChildTunnel = await deployments.read('LandTunnel', 'fxChildTunnel');
    if (
      fxChildTunnel !== PolygonLandTunnel.address &&
      fxChildTunnel == constants.AddressZero
    ) {
      await deployments.execute(
        'LandTunnel',
        {from: deployer},
        'setFxChildTunnel',
        PolygonLandTunnel.address
      );
    }

    const PolygonLand = await deploymentsL2.getOrNull('PolygonLand');
    if (PolygonLand) {
      const isMinter = await deploymentsL2.read(
        'PolygonLand',
        'isMinter',
        PolygonLandTunnel.address
      );

      if (!isMinter) {
        await deploymentsL2.execute(
          'PolygonLand',
          {from: deployerOnL2},
          'setMinter',
          PolygonLandTunnel.address,
          true
        );
      }
    }
  }
};

export default func;
func.tags = ['LandTunnel', 'LandTunnel_deploy', 'L1'];
func.dependencies = [
  'Land',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTest;
