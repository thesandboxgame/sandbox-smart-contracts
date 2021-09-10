import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await deployments.deploy('PolygonAvatarSale', {
    from: deployer,
    log: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      upgradeIndex: 1,
    },
  });
};

export default func;
func.tags = ['PolygonAvatarSaleV2', 'PolygonAvatarSaleV2_deploy'];
func.dependencies = ['PolygonAvatarSale_deploy'];
func.skip = skipUnlessTestnet;
