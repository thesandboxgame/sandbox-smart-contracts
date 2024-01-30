import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {keccak256, toUtf8Bytes} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, sandAdmin, upgradeAdmin} = await getNamedAccounts();

  const TSB_ROLE = keccak256(toUtf8Bytes('TSB_ROLE'));
  const PARTNER_ROLE = keccak256(toUtf8Bytes('PARTNER_ROLE'));

  await deploy('OrderValidator', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/marketplace/contracts/OrderValidator.sol:OrderValidator',
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
func.tags = ['OrderValidator', 'OrderValidator_deploy'];
