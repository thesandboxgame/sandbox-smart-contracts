import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('Catalyst', {
    from: deployer,
    log: true,
    contract: '@sandbox-smart-contracts/asset/contracts/Catalyst.sol:Catalyst',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      methodName: 'reinitialize',
      upgradeIndex: 1,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Catalyst_upgrade'];
