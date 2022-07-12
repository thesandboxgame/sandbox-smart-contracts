import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {
  getChainIndex,
  skipUnlessL1,
  skipUnlessTestnet,
} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const landToken = await deployments.get('Land');
  const adminUser = sandAdmin;
  const mapLib = await deployments.get('MapLib');
  await deployments.deploy('Estate', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    contract: 'EstateTokenV1',
    libraries: {
      MapLib: mapLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initV1',
        args: [
          TRUSTED_FORWARDER.address,
          adminUser,
          landToken.address,
          await getChainIndex(hre),
          'TSB Estate',
          'TSB_ESTATE',
        ],
      },
      upgradeIndex: 0,
    },
  });
};

export default func;
func.tags = ['Estate', 'Estate_deploy'];
func.dependencies = ['MapLib_deploy', 'TRUSTED_FORWARDER', 'Land'];
func.skip = async (hre) =>
  (await skipUnlessTestnet(hre)) && (await skipUnlessL1(hre));
