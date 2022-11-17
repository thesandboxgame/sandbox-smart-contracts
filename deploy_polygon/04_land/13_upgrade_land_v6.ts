import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessL2} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const quadLib = await deployments.get('QuadLib');
  await deploy('PolygonLand', {
    from: deployer,
    contract: 'src/solc_0.8/polygon/child/land/PolygonLandV4.sol:PolygonLandV4',
    libraries: {
      QuadLib: quadLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1,
    },
    log: true,
  });
};

export default func;
func.tags = ['PolygonLand', 'PolygonLandV4', 'PolygonLandV4_deploy', 'L2'];
func.dependencies = ['PolygonLand_deploy', 'QuadLib_deploy'];
func.skip = skipUnlessL2;
