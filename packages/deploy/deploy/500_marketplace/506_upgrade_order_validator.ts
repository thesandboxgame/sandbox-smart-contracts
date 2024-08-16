import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy, catchUnknownSigner} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();
  await catchUnknownSigner(
    deploy('OrderValidator', {
      from: deployer,
      contract:
        '@sandbox-smart-contracts/marketplace/contracts/OrderValidator.sol:OrderValidator',
      proxy: {
        owner: upgradeAdmin,
        proxyContract: 'OpenZeppelinTransparentProxy',
        upgradeIndex: 1,
      },
      log: true,
    })
  );
};

export default func;
func.tags = [
  'OrderValidator',
  'OrderValidator',
  'OrderValidator_deploy',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['OrderValidator_deploy'];
