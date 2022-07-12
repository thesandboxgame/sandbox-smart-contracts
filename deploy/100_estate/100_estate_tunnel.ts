import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {isTest, skipUnlessL1, skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const FXROOT = await deployments.get('FXROOT');
  const CHECKPOINTMANAGER = await deployments.get('CHECKPOINTMANAGER');
  const estate = await deployments.get('Estate');
  const contract = isTest(hre) ? 'MockEstateTunnel' : 'EstateTunnel';
  await deployments.deploy('EstateTunnel', {
    contract,
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    args: [
      CHECKPOINTMANAGER.address,
      FXROOT.address,
      estate.address,
      TRUSTED_FORWARDER.address,
    ],
  });
};
export default func;
func.tags = ['EstateTunnel', 'EstateTunnel_deploy'];
func.dependencies = [
  'Estate_deploy',
  'FXROOT',
  'CHECKPOINTMANAGER',
  'TRUSTED_FORWARDER',
];
func.skip = async (hre) =>
  (await skipUnlessTestnet(hre)) && (await skipUnlessL1(hre));
