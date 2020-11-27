import { ethers, deployments, getNamedAccounts } from 'hardhat';
import { Contract, BigNumber } from 'ethers';

const exampleGemId = 6;
const notInOrderGemId = 56;
const exampleCatalystId = 5;

export const setupGemsAndCatalysts = deployments.createFixture(async () => {
  await deployments.fixture();
  const gemsCatalystsRegistry: Contract = await ethers.getContract(
    'GemsCatalystsRegistry'
  );
  const powerGem: Contract = await ethers.getContract('Gem_Power');
  const defenseGem: Contract = await ethers.getContract('Gem_Defense');
  const speedGem: Contract = await ethers.getContract('Gem_Speed');
  const magicGem: Contract = await ethers.getContract('Gem_Magic');
  const luckGem: Contract = await ethers.getContract('Gem_Luck');
  const commonCatalyst: Contract = await ethers.getContract('Catalyst_Common');
  const rareCatalyst: Contract = await ethers.getContract('Catalyst_Rare');
  const accounts = await getNamedAccounts();

  await deployments.deploy(`Gem_Example`, {
    contract: 'Gem',
    from: accounts.deployer,
    log: true,
    args: ['Gem_Example', 'Gem_Example', accounts.deployer, exampleGemId],
  });
  const gemExample: Contract = await ethers.getContract('Gem_Example');

  await deployments.deploy(`Gem_NotInOrder`, {
    contract: 'Gem',
    from: accounts.deployer,
    log: true,
    args: ['Gem_NotInOrder', 'Gem_NotInOrder', accounts.deployer, notInOrderGemId],
  });
  const gemNotInOrder: Contract = await ethers.getContract('Gem_NotInOrder');

  await deployments.deploy(`Catalyst_Example`, {
    contract: 'PrimaryCatalyst',
    from: accounts.deployer,
    log: true,
    args: ['Catalyst_Example', 'Catalyst_Example', accounts.deployer, 5, exampleCatalystId],
  });
  const catalystExample: Contract = await ethers.getContract(
    'Catalyst_Example'
  );

  await commonCatalyst
    .connect(ethers.provider.getSigner(accounts.deployer))
    .mint(accounts.deployer, BigNumber.from('8'));
  await commonCatalyst
    .connect(ethers.provider.getSigner(accounts.deployer))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  await rareCatalyst
    .connect(ethers.provider.getSigner(accounts.deployer))
    .mint(accounts.deployer, BigNumber.from('8'));
  await rareCatalyst
    .connect(ethers.provider.getSigner(accounts.deployer))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  await powerGem
    .connect(ethers.provider.getSigner(accounts.deployer))
    .mint(accounts.deployer, BigNumber.from('100'));
  await powerGem
    .connect(ethers.provider.getSigner(accounts.deployer))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  await defenseGem
    .connect(ethers.provider.getSigner(accounts.deployer))
    .mint(accounts.deployer, BigNumber.from('50'));
  await defenseGem
    .connect(ethers.provider.getSigner(accounts.deployer))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  return {
    gemsCatalystsRegistry,
    powerGem,
    defenseGem,
    speedGem,
    magicGem,
    luckGem,
    gemExample,
    gemNotInOrder,
    commonCatalyst,
    rareCatalyst,
    catalystExample,
    accounts,
  };
});
