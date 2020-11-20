import { ethers, deployments, getNamedAccounts } from 'hardhat';

import { Contract, BigNumber } from 'ethers';


export const setupGemsAndCatalysts = deployments.createFixture(async () => {
  await deployments.fixture('GemsAndCatalysts');
  const accounts = await getNamedAccounts();
  const gemsAndCatalysts: Contract = await ethers.getContract('GemsAndCatalysts');


  // await deployments.deploy('MockERC677Receiver', {
  //   from: accounts.deployer,
  //   args: [],
  // });
  // const tokenReceiver: Contract = await ethers.getContract(
  //   'MockERC677Receiver'
  // );
  // await deployments.deploy('EmptyContract', {
  //   from: accounts.deployer,
  //   args: [],
  // });
  // const emptyContract: Contract = await ethers.getContract('EmptyContract');
  // await deployments.deploy('FallBackContract', {
  //   from: accounts.deployer,
  //   args: [],
  // });
  // const fallbackContract: Contract = await ethers.getContract(
  //   'FallBackContract'
  // );
  // const tx = await gemToken
  //   .connect(ethers.provider.getSigner(accounts.deployer))
  //   .mint(accounts.deployer, BigNumber.from('800000000000000000'));
  // await tx.wait();
  // return {
  //   gemToken,
  //   tokenReceiver,
  //   emptyContract,
  //   fallbackContract,
  // };
});
