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
  const {deploy, catchUnknownSigner} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();
  // it is possible to have L1 and L2 nn the case of hardhat local node.
  await catchUnknownSigner(
    deploy('Land', {
      from: deployer,
      log: true,
      contract: '@sandbox-smart-contracts/land/contracts/LandV3.sol:LandV3',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 1,
      },
    })
  );
};
export default func;
func.tags = ['Land', 'Land_upgrade_1', 'L1'];
func.dependencies = ['Land_deploy'];
