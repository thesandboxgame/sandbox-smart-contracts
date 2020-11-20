import { ethers, deployments, getNamedAccounts } from 'hardhat';

import { Contract, BigNumber } from 'ethers';

export const setupERC677 = deployments.createFixture(async () => {
  await deployments.fixture('Gems');
  const accounts = await getNamedAccounts();
  const gemToken: Contract = await ethers.getContract('Gem_Power');
  await deployments.deploy('MockERC677Receiver', {
    from: accounts.deployer,
    args: [],
  });
  const tokenReceiver: Contract = await ethers.getContract(
    'MockERC677Receiver'
  );
  await deployments.deploy('EmptyContract', {
    from: accounts.deployer,
    args: [],
  });
  const emptyContract: Contract = await ethers.getContract('EmptyContract');
  await deployments.deploy('FallBackContract', {
    from: accounts.deployer,
    args: [],
  });
  const fallbackContract: Contract = await ethers.getContract(
    'FallBackContract'
  );
  const tx = await gemToken
    .connect(ethers.provider.getSigner(accounts.deployer))
    .mint(accounts.deployer, BigNumber.from('800000000000000000'));
  await tx.wait();
  return {
    gemToken,
    tokenReceiver,
    emptyContract,
    fallbackContract,
  };
});
