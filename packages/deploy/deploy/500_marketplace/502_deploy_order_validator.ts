import {keccak256, toUtf8Bytes} from 'ethers';
import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();

  const TSB_ROLE = keccak256(toUtf8Bytes('TSB_ROLE'));
  const PARTNER_ROLE = keccak256(toUtf8Bytes('PARTNER_ROLE'));

  await deploy('OrderValidator', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/marketplace@1.0.1/contracts/OrderValidator.sol:OrderValidator',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [sandAdmin, [TSB_ROLE, PARTNER_ROLE], [false, false], false],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = [
  'OrderValidator',
  'OrderValidator_deploy',
  DEPLOY_TAGS.L1,
  DEPLOY_TAGS.L1_PROD,
  DEPLOY_TAGS.L1_TEST,
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
