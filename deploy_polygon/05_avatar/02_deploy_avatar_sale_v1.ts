import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTestnet} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();
  const avatarContract = await deployments.get('PolygonAvatar');
  const sandContract = await deployments.get('PolygonSand');
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const adminRole = sandAdmin;
  await deployments.deploy('PolygonAvatarSale', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          avatarContract.address,
          sandContract.address,
          TRUSTED_FORWARDER.address,
          adminRole,
        ],
      },
      upgradeIndex: 0,
    },
  });
};

export default func;
func.tags = ['PolygonAvatarSale', 'PolygonAvatarSale_deploy'];
func.dependencies = [
  'TRUSTED_FORWARDER',
  'PolygonAvatar_deploy',
  'PolygonSand_deploy',
];
func.skip = skipUnlessTestnet;
