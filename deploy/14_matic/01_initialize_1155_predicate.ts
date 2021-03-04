import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, getUnnamedAccounts} = hre;
  const {execute} = deployments;

  const {deployer} = await getNamedAccounts();
  const users = await getUnnamedAccounts();

  const DummyL2AssetAddress = users[7];

  await execute(
    'SandboxMintableERC1155Predicate',
    {from: deployer, log: true},
    'initialize',
    deployer,
    DummyL2AssetAddress
  );
};
export default func;
func.tags = ['Predicate1155', 'Predicate1155_setup'];
func.dependencies = ['Predicate1155_deploy'];
