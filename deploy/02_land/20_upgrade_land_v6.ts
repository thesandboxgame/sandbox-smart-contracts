import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {skipUnlessL1} from '../../utils/network';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  const quadLib = await deployments.get('QuadLib');
  await deploy('Land', {
    from: deployer,
    contract: 'src/solc_0.8/polygon/root/land/LandV4.sol:LandV4',
    libraries: {
      QuadLib: quadLib.address,
    },
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 3,
    },
    log: true,
  });
};

export default func;
func.tags = ['Land', 'LandV4', 'LandV4_deploy'];
func.dependencies = [
  'Land_deploy',
  'Land_Old_deploy',
  'LandV2_deploy',
  'LandV3_deploy',
  'QuadLib_deploy',
];
func.skip = skipUnlessL1;
