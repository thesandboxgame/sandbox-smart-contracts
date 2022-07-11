import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {
    deployer,
    sandAdmin,
    assetBouncerAdmin,
    upgradeAdmin,
  } = await getNamedAccounts();
  const {deploy} = deployments;

  const sandContract = await deployments.get('Sand');

  await deploy('TestAsset', {
    from: deployer,
    contract: 'TestAsset',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'init',
        args: [sandContract.address, sandAdmin, assetBouncerAdmin], // metaTxContract, admin, bouncerAdmin
      },
      upgradeIndex: 0,
    },
    log: true,
  });
};

export default func;
func.tags = ['TestAsset', 'TestAsset_deploy'];
func.dependencies = ['Sand', 'Sand_deploy'];
func.skip = skipUnlessTest;
