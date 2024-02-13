/*
  The original Land contract was deployed from the `core` package.
  We upgrade the Land contract from the new land package
 */
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  // it is possible to have L1 and L2 nn the case of hardhat local node.
  await deploy('Land', {
    from: deployer,
    log: true,
    contract: '@sandbox-smart-contracts/land/contracts/LandV3.sol:LandV3',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 0,
    },
  });
};
export default func;
func.tags = ['Land', 'Land_deploy_0.0.3', 'L1'];
