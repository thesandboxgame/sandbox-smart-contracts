import {ethers} from 'hardhat';
import {Contract, Signer} from 'ethers';

export async function deploy(
  name: string,
  users: Signer[] = []
): Promise<Contract[]> {
  const Contract = await ethers.getContractFactory(name);
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  const ret = [];
  for (const s of users) {
    ret.push(await contract.connect(s));
  }
  ret.push(contract);
  return ret;
}

export async function deployWithProxy(
  name: string,
  users: Signer[] = []
): Promise<Contract[]> {
  const contract = await deploy(name, users);

  const Proxy = await ethers.getContractFactory('FakeProxy');
  // This uses signers[0]
  const proxy = await Proxy.deploy(await contract[0].getAddress());
  await proxy.waitForDeployment();
  const ret = [];
  for (let i = 0; i < contract.length; i++) {
    ret[i] = await contract[i].attach(await proxy.getAddress());
  }
  // add implementation contract
  ret.push(contract[contract.length - 1]);
  return ret;
}

export async function deployAssetMatcher() {
  const [deployer, user] = await ethers.getSigners();

  // const AssetMatcher = await ethers.getContractFactory('AssetMatcher');
  // const assetMatcherAsDeployer = await AssetMatcher.deploy();
  // const assetMatcherAsUser = await assetMatcherAsDeployer.connect(user);
  const [assetMatcherAsDeployer, assetMatcherAsUser] = await deployWithProxy(
    'AssetMatcher',
    [deployer, user]
  );

  return {
    assetMatcherAsDeployer,
    assetMatcherAsUser,
    deployer,
    user,
  };
}
