import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, backendAuthWallet} = await getNamedAccounts();
  await deploy('PolygonAuthValidator', {
    contract: 'AuthValidator',
    from: deployer,
    args: [sandAdmin, backendAuthWallet],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['PolygonAuthValidator', 'PolygonAuthValidator_deploy'];
