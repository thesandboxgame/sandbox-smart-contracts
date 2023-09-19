import {ethers} from 'hardhat';
import {Contract, Signer} from 'ethers';

export async function deploy(
  name: string,
  users: Signer[] = []
): Promise<Contract[]> {
  const Contract = await ethers.getContractFactory(name);
  const contract = await Contract.deploy();

  const ret = Array();
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
  const proxy = await Proxy.deploy(contract[0]);

  const ret = Array();
  for (let i = 0; i < contract.length; i++) {
    ret[i] = await contract[i].attach(proxy);
  }
  // add implementation contract
  ret.push(contract[0]);
  return ret;
}

export async function deployAssetMatcher() {
  const [deployer] = await ethers.getSigners();
  const [contract] = await deploy(
    'AssetMatcher',
    [deployer]
  );
  return {
    contract,
    deployer,
  };
}
