import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {getChainIndex, skipUnlessL2} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, upgradeAdmin, sandAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER');
  const landToken = await deployments.get('PolygonLand');
  const adminUser = sandAdmin;
  const mapLib = await deployments.get('MapLib');
  await deployments.deploy('PolygonEstate', {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: true,
    contract: 'PolygonEstateTokenV1',
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
          'Polygon TSB Estate',
          'TSB_ESTATE',
        ],
      },
      upgradeIndex: 0,
    },
  });
};

export default func;
func.tags = ['PolygonEstate', 'PolygonEstate_deploy'];
func.dependencies = [
  'PolygonMapLib_deploy',
  'TRUSTED_FORWARDER',
  'PolygonLand',
];
func.skip = skipUnlessL2;
