import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, catalystMinter} = await getNamedAccounts();
  await deploy('FaucetsERC1155', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/faucets/contracts/FaucetsERC1155.sol:FaucetsERC1155',
    log: true,
    skipIfAlreadyDeployed: true,
    args: [catalystMinter],
  });
};

func.tags = ['FaucetsERC1155', 'FaucetsERC1155_deploy'];

export default func;
