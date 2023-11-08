import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {utils} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();

  const TSB_ROLE = utils.keccak256(utils.toUtf8Bytes('TSB_ROLE'));
  const PARTNER_ROLE = utils.keccak256(utils.toUtf8Bytes('PARTNER_ROLE'));
  const ERC20_ROLE = utils.keccak256(utils.toUtf8Bytes('ERC20_ROLE'));

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
          false,
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
