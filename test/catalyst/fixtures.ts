import { ethers, deployments, getNamedAccounts } from 'hardhat';
import { Contract, BigNumber } from 'ethers';


export const setupGemsAndCatalysts = deployments.createFixture(async () => {
  await deployments.fixture();
  const gemsAndCatalysts: Contract = await ethers.getContract('GemsAndCatalysts');
  const powerGem: Contract = await ethers.getContract('Gem_Power');
  const commonCatalyst: Contract = await ethers.getContract('Catalyst_Common');
  const accounts = await getNamedAccounts();

  await deployments.deploy(`Gem_Example`, {
    contract: 'Gem',
    from: accounts.deployer,
    log: true,
    args: ['Gem_Example', 'Gem_Example', accounts.deployer, 6],
  });
  const gemExample: Contract = await ethers.getContract('Gem_Example');

  await deployments.deploy(`Gem_NotInOrder`, {
    contract: 'Gem',
    from: accounts.deployer,
    log: true,
    args: ['Gem_NotInOrder', 'Gem_NotInOrder', accounts.deployer, 56],
  });
  const gemNotInOrder: Contract = await ethers.getContract('Gem_NotInOrder');

  await commonCatalyst
    .connect(ethers.provider.getSigner(accounts.deployer))
    .mint(accounts.deployer, BigNumber.from('8'));
  await commonCatalyst
    .connect(ethers.provider.getSigner(accounts.deployer))
    .setSuperOperator(gemsAndCatalysts.address, true);

  await powerGem
    .connect(ethers.provider.getSigner(accounts.deployer))
    .mint(accounts.deployer, BigNumber.from('100'));
  await powerGem
    .connect(ethers.provider.getSigner(accounts.deployer))
    .setSuperOperator(gemsAndCatalysts.address, true);

  return {
    gemsAndCatalysts,
    powerGem,
    gemExample,
    commonCatalyst,
    gemNotInOrder,
    accounts
  };
});
