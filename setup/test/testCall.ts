import hre from 'hardhat';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {ethers} = hre;
  const Asset = await ethers.getContract('Asset');
  const AssetFactory = await ethers.getContractFactory('TestAsset');
  const AssetContract = AssetFactory.attach(Asset.address);
  const hello = await AssetContract.callStatic.test();
  console.log({hello});
};

export default func;
if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
