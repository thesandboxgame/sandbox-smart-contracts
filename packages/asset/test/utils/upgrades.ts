import {ethers} from 'hardhat';
import {Contract, ContractFactory} from 'ethers';

export async function deployProxy(
  contractFactory: ContractFactory,
  args: unknown[],
  params: {initializer?: string}
): Promise<Contract> {
  const contract = await contractFactory.deploy();
  await contract.deployed();
  const Proxy = await ethers.getContractFactory('FakeProxy');
  const proxy = await Proxy.deploy(contract.address);
  await proxy.deployed();
  const ret = await contract.attach(proxy.address);
  if (params.initializer) {
    await ret[params.initializer](...args);
  }
  return ret;
}
