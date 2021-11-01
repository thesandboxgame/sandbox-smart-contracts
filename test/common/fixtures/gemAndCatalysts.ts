import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {BigNumber, Contract} from 'ethers';

const exampleGemId = 6;
const notInOrderGemId = 56;
const exampleCatalystId = 5;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const gemsAndCatalystsFixtures = async () => {
  const gemsCatalystsRegistry: Contract = await ethers.getContract(
    'GemsCatalystsRegistry'
  );
  const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER');
  const sandContract: Contract = await ethers.getContract('Sand');
  const powerGem: Contract = await ethers.getContract('Gem_POWER');
  const defenseGem: Contract = await ethers.getContract('Gem_DEFENSE');
  const speedGem: Contract = await ethers.getContract('Gem_SPEED');
  const magicGem: Contract = await ethers.getContract('Gem_MAGIC');
  const luckGem: Contract = await ethers.getContract('Gem_LUCK');
  const commonCatalyst: Contract = await ethers.getContract('Catalyst_COMMON');
  const rareCatalyst: Contract = await ethers.getContract('Catalyst_RARE');
  const epicCatalyst: Contract = await ethers.getContract('Catalyst_EPIC');
  const legendaryCatalyst: Contract = await ethers.getContract(
    'Catalyst_LEGENDARY'
  );
  const users = await getUnnamedAccounts();
  const {
    deployer,
    catalystMinter,
    gemMinter,
    gemsCatalystsRegistryAdmin,
  } = await getNamedAccounts();
  const catalystOwner = users[0];
  const gemOwner = users[0];
  const gemsCatalystsRegistrySuperOperator = users[1];
  const user3 = users[3];

  await deployments.deploy(`Gem_Example`, {
    contract: 'Gem',
    from: gemOwner,
    log: true,
    args: [
      'Gem_Example',
      'Gem_Example',
      gemOwner,
      exampleGemId,
      gemsCatalystsRegistry.address,
    ],
  });
  const gemExample: Contract = await ethers.getContract('Gem_Example');

  await deployments.deploy(`Gem_NotInOrder`, {
    contract: 'Gem',
    from: gemOwner,
    args: [
      'Gem_NotInOrder',
      'Gem_NotInOrder',
      gemOwner,
      notInOrderGemId,
      gemsCatalystsRegistry.address,
    ],
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
      gemsCatalystsRegistry.address,
    ],
  });
  const catalystExample: Contract = await ethers.getContract(
    'Catalyst_Example'
  );
  const gemsCatalystsUnit = '1000000000000000000';
  const mintingAmount = BigNumber.from('8').mul(
    BigNumber.from(gemsCatalystsUnit)
  );
  await commonCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, mintingAmount);

  await rareCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, mintingAmount);

  await epicCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, mintingAmount);

  await legendaryCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, mintingAmount);

  await powerGem
    .connect(ethers.provider.getSigner(gemMinter))
    .mint(gemOwner, mintingAmount);

  await defenseGem
    .connect(ethers.provider.getSigner(gemMinter))
    .mint(gemOwner, mintingAmount);

  await speedGem
    .connect(ethers.provider.getSigner(gemMinter))
    .mint(gemOwner, mintingAmount);

  await magicGem
    .connect(ethers.provider.getSigner(gemMinter))
    .mint(gemOwner, mintingAmount);

  await luckGem
    .connect(ethers.provider.getSigner(gemMinter))
    .mint(gemOwner, mintingAmount);

  await gemsCatalystsRegistry
    .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
    .setSuperOperator(gemsCatalystsRegistrySuperOperator, true);

  const gemsCatalystsRegistryAsCataystOwner = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(catalystOwner)
  );

  const gemsCatalystsRegistryAsRegistrySuperOperator = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemsCatalystsRegistrySuperOperator)
  );

  const gemsCatalystsRegistryAsUser3 = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(users[3])
  );

  const gemsCatalystsRegistryAsRegAdmin = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemsCatalystsRegistryAdmin)
  );

  const gemsCatalystsRegistryAsCataystMinter = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(catalystMinter)
  );

  const gemsCatalystsRegistryAsGemOwner = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemOwner)
  );

  const gemsCatalystsRegistryAsGemMinter = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemMinter)
  );

  const gemsCatalystsRegistryAsDeployer = await gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(deployer)
  );
  return {
    sandContract,
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
    epicCatalyst,
    legendaryCatalyst,
    gemsCatalystsRegistryAdmin,
    catalystMinter,
    gemMinter,
    catalystOwner,
    gemOwner,
    user3,
    gemsCatalystsRegistryAsCataystOwner,
    gemsCatalystsRegistryAsRegistrySuperOperator,
    gemsCatalystsRegistryAsUser3,
    gemsCatalystsRegistryAsRegAdmin,
    gemsCatalystsRegistryAsCataystMinter,
    gemsCatalystsRegistryAsGemOwner,
    gemsCatalystsRegistryAsGemMinter,
    gemsCatalystsRegistryAsDeployer,
    trustedForwarder,
  };
};
