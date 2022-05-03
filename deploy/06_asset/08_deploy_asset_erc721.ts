import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {assetAdmin, upgradeAdmin, deployer} = await getNamedAccounts();
  const {deploy} = deployments;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');

  await deploy('AssetERC721', {
    from: deployer,
    contract: 'AssetERC721',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [TRUSTED_FORWARDER.address, assetAdmin],
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['AssetERC721', 'AssetERC721_deploy'];
func.dependencies = ['TRUSTED_FORWARDER'];
func.skip = skipUnlessTestnet;
