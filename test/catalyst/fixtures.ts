import { ethers, deployments } from 'hardhat';

import { Contract } from 'ethers';


export const setupGemsAndCatalysts = deployments.createFixture(async () => {
  await deployments.fixture('GemsAndCatalysts');
  const gemsAndCatalysts: Contract = await ethers.getContract('GemsAndCatalysts');
  const powerGem: Contract = await ethers.getContract('Gem_Power');
  const commonCatalyst: Contract = await ethers.getContract('Catalyst_Common');

  // const tx = await gemToken
  //   .connect(ethers.provider.getSigner(accounts.deployer))
  //   .mint(accounts.deployer, BigNumber.from('800000000000000000'));
  // await tx.wait();
  return {
    gemsAndCatalysts,
    powerGem,
    commonCatalyst,
  };
});
