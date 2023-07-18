import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, assetAdmin} = await getNamedAccounts();
  await deploy('AssetAuthValidator', {
    from: deployer,
    contract: 'AuthValidator',
    args: [assetAdmin],
    log: true,
  });
};
export default func;
func.tags = ['AssetAuthValidator', 'AssetAuthValidator_deploy', 'L2'];
