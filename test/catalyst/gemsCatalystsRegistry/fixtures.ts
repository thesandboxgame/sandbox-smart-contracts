import {
  ethers,
  deployments,
  getUnnamedAccounts,
  getNamedAccounts,
} from 'hardhat';
import { Contract, BigNumber } from 'ethers';

const exampleGemId = 6;
const notInOrderGemId = 56;
const exampleCatalystId = 5;

export const setupGemsAndCatalysts = deployments.createFixture(async () => {
  await deployments.fixture(); // TODO which fixture do we need ?
  const gemsCatalystsRegistry: Contract = await ethers.getContract(
    'GemsCatalystsRegistry'
  );
  const powerGem: Contract = await ethers.getContract('Gem_POWER');
  const defenseGem: Contract = await ethers.getContract('Gem_DEFENSE');
  const speedGem: Contract = await ethers.getContract('Gem_SPEED');
  const magicGem: Contract = await ethers.getContract('Gem_MAGIC');
  const luckGem: Contract = await ethers.getContract('Gem_LUCK');
  const commonCatalyst: Contract = await ethers.getContract('Catalyst_COMMON');
  const rareCatalyst: Contract = await ethers.getContract('Catalyst_RARE');
  const users = await getUnnamedAccounts();
  const {
    catalystMinter,
    gemMinter,
    gemsCatalystsRegistryAdmin,
  } = await getNamedAccounts();
  const catalystOwner = users[0];
  const gemOwner = users[0];
  const gemsCatalystsRegistrySuperOperator = users[1];

  await deployments.deploy(`Gem_Example`, {
    contract: 'Gem',
    from: gemOwner,
    log: true,
    args: ['Gem_Example', 'Gem_Example', gemOwner, exampleGemId],
  });
  const gemExample: Contract = await ethers.getContract('Gem_Example');

  await deployments.deploy(`Gem_NotInOrder`, {
    contract: 'Gem',
    from: gemOwner,
    args: ['Gem_NotInOrder', 'Gem_NotInOrder', gemOwner, notInOrderGemId],
  });
  const gemNotInOrder: Contract = await ethers.getContract('Gem_NotInOrder');

  const DefaultAttributes = await deployments.get(`DefaultAttributes`);

  await deployments.deploy(`Catalyst_Example`, {
    contract: 'Catalyst',
    from: catalystOwner,
    args: [
      'Catalyst_Example',
      'Catalyst_Example',
      catalystOwner,
      5,
      exampleCatalystId,
      DefaultAttributes.address,
    ],
  });
  const catalystExample: Contract = await ethers.getContract(
    'Catalyst_Example'
  );

  await commonCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, BigNumber.from('8'));
  await commonCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  await rareCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, BigNumber.from('8'));
  await rareCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  await powerGem
    .connect(ethers.provider.getSigner(gemMinter))
    .mint(gemOwner, BigNumber.from('100'));
  await powerGem
    .connect(ethers.provider.getSigner(gemMinter))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  await defenseGem
    .connect(ethers.provider.getSigner(gemMinter))
    .mint(gemOwner, BigNumber.from('50'));
  await defenseGem
    .connect(ethers.provider.getSigner(gemMinter))
    .setSuperOperator(gemsCatalystsRegistry.address, true);

  await gemsCatalystsRegistry
    .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
    .setSuperOperator(gemsCatalystsRegistrySuperOperator, true);

  return {
    gemsCatalystsRegistry,
    gemsCatalystsRegistrySuperOperator,
    powerGem,
    defenseGem,
    speedGem,
    magicGem,
    luckGem,
    gemExample,
    gemNotInOrder,
    catalystExample,
    commonCatalyst,
    rareCatalyst,
    gemsCatalystsRegistryAdmin,
    catalystMinter,
    gemMinter,
    catalystOwner,
    gemOwner,
  };
});
