import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy('BatchTransfer', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/batch-transfers/contracts/BatchTransfer.sol:BatchTransfer',
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

func.tags = ['BatchTransfer', 'BatchTransfer_deploy'];

export default func;
