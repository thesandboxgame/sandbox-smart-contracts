// TODO: Validate if we want a L1 avatar contract ?

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isTest, skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const avatar = await deployments.get('Avatar');
  // On hardhat or localhost use MockAvatar so we can skip the matic bridge event check
  const contract = isTest(hre) ? 'MockAvatarTunnel' : 'AvatarTunnel';
  await deployments.deploy('AvatarTunnel', {
    contract,
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      CHECKPOINTMANAGER.address,
      FXROOT.address,
      avatar.address,
      TRUSTED_FORWARDER.address,
    ],
  });
};
export default func;
func.tags = ['Avatar', 'AvatarTunnel_deploy'];
func.dependencies = [
  'Avatar_deploy',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = skipUnlessTestnet;
