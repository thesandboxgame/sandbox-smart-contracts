// TODO: Validate if we want a L1 avatar contract ?

import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const adminRole = sandAdmin;
  await deployments.deploy('Avatar', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          'Avatar',
          'TSBAV',
          'http://XXX.YYY',
          TRUSTED_FORWARDER.address,
          adminRole,
        ],
      },
      upgradeIndex: 0,
    },
  });
};

export default func;
func.tags = ['Avatar', 'Avatar_deploy'];
func.dependencies = ['TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;
