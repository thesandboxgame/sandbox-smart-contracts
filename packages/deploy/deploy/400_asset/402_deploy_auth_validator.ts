import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, authValidatorAdmin, backendAuthWallet} =
    await getNamedAccounts();

  await deploy('AuthValidator', {
    from: deployer,
    contract: '@sandbox-smart-contracts/asset/contracts/AuthValidator.sol:AuthValidator', // TODO: is already deployed ?
    args: [authValidatorAdmin, backendAuthWallet],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['AuthValidator', 'AuthValidator_deploy'];
