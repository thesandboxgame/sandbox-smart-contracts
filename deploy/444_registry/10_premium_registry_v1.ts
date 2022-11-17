import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessL1} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    sandAdmin: adminUser,
  } = await getNamedAccounts();
  const mapLib = await deployments.get('MapLib');
  const land = await deployments.get('Land');
  await deployments.deploy('PremiumLandRegistry', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    contract: 'PremiumLandRegistry',
    libraries: {
      MapLib: mapLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'PremiumLandRegistry_init',
        args: [adminUser, land.address],
      },
      upgradeIndex: 0,
    },
  });
};

export default func;
func.tags = ['PremiumRegistry', 'PremiumRegistry_deploy'];
func.dependencies = ['MapLib_deploy', 'Land_deploy'];
func.skip = skipUnlessL1;
