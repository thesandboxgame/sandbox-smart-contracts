import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    upgradeAdmin,
    kycAdmin,
    backendKYCWallet,
  } = await getNamedAccounts();
  const {deploy} = deployments;

  await deploy('PolygonKYCToken', {
    from: deployer,
    contract: 'KYCToken',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [kycAdmin, backendKYCWallet],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['PolygonKYCToken', 'PolygonKYCToken_deploy', 'L2'];
func.dependencies = [];
func.skip = skipUnlessTestnet;
