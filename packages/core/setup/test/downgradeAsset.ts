import hre from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, upgrades, ethers} = hre;
  const {deployer} = await getNamedAccounts();

  const AssetInstance = await deployments.get('Asset');
  const Asset = await ethers.getContractFactory('Asset', deployer);
  const upgraded = await upgrades.upgradeProxy(AssetInstance.address, Asset);

  await upgraded.deployed();

  try {
    const hello = await upgraded.callStatic.test();
    console.log({hello});
  } catch (e) {
    console.log(e);
  }
};

export default func;
if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
