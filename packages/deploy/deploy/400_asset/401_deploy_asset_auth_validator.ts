import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, assetAdmin} = await getNamedAccounts();
  await deploy('AuthSuperValidator', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/asset-1.0.3/contracts/AuthSuperValidator.sol:AuthSuperValidator',
    args: [assetAdmin],
    log: true,
  });
};
export default func;
func.tags = ['AuthSuperValidator', 'AuthSuperValidator_deploy', 'L2'];
