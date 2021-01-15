import hre, {getUnnamedAccounts} from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, DeploymentSubmission} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {
    deployments,
    getNamedAccounts,
    getUnnamedAccounts,
    getChainId,
    upgrades,
    ethers,
  } = hre;
  const {deployer} = await getNamedAccounts();
  const others = await getUnnamedAccounts();

  const Asset = await deployments.get('Asset');
  const TestAsset = await ethers.getContractFactory('TestAsset', deployer);
  const upgraded = await upgrades.upgradeProxy(Asset.address, TestAsset);

  await upgraded.deployed();

  const AssetContract = TestAsset.attach(Asset.address).connect(others[0]);
  const hello = await AssetContract.callStatic.test();
  console.log({hello});
};

export default func;
if (require.main === module) {
  func(hre);
}
