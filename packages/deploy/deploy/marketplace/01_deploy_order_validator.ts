import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();

  const TSB_ROLE =
    '0x6278160ef7ca8a5eb8e5b274bcc0427c2cc7e12eee2a53c5989a1afb360f6404';
  const PARTNER_ROLE =
    '0x2f049b28665abd79bc83d9aa564dba6b787ac439dba27b48e163a83befa9b260';
  const ERC20_ROLE =
    '0x839f6f26c78a3e8185d8004defa846bd7b66fef8def9b9f16459a6ebf2502162';

  await deploy('OrderValidator', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/marketplace/contracts/OrderValidator.sol:OrderValidator',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: '__OrderValidator_init_unchained',
        args: [
          sandAdmin,
          [TSB_ROLE, PARTNER_ROLE, ERC20_ROLE],
          [false, false, false],
          true,
        ],
      },
      upgradeIndex: 0,
    },
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['OrderValidator', 'OrderValidator_deploy'];
