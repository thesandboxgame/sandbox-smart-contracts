import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  await deploy(`SandboxMintableERC1155Predicate`, {
    from: deployer,
    log: true,
    args: [],
  });
};
export default func;
func.tags = ['Predicate1155', 'Predicate1155_deploy'];
func.dependencies = [];
