import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, assetAdmin} = await getNamedAccounts();
  await deploy('AuthSuperValidator', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/asset/contracts/AuthSuperValidator.sol:AuthSuperValidator',
    args: [assetAdmin],
    log: true,
  });
};
export default func;
func.tags = [
  'AuthSuperValidator_v2',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
