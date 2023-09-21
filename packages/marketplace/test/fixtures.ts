import {ethers} from 'hardhat';

export async function deployAssetMatcher() {
  const [deployer, user] = await ethers.getSigners();
  const AssetMatcher = await ethers.getContractFactory('AssetMatcher');
  const assetMatcherAsDeployer = await AssetMatcher.deploy();
  const assetMatcherAsUser = await assetMatcherAsDeployer.connect(user);

  return {
    assetMatcherAsDeployer,
    assetMatcherAsUser,
    deployer,
    user,
  };
}
