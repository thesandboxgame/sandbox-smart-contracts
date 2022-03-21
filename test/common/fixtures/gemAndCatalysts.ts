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
    'PolygonGemsCatalystsRegistry'
  );
  const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER');
  //const sandContract: Contract = await ethers.getContract('PolygonSand');
  const powerGem: Contract = await ethers.getContract('PolygonGem_POWER');
  const defenseGem: Contract = await ethers.getContract('PolygonGem_DEFENSE');
  const speedGem: Contract = await ethers.getContract('PolygonGem_SPEED');
  const magicGem: Contract = await ethers.getContract('PolygonGem_MAGIC');
  const luckGem: Contract = await ethers.getContract('PolygonGem_LUCK');
  const commonCatalyst: Contract = await ethers.getContract(
    'PolygonCatalyst_COMMON'
  );
  const rareCatalyst: Contract = await ethers.getContract(
    'PolygonCatalyst_RARE'
  );
  const epicCatalyst: Contract = await ethers.getContract(
    'PolygonCatalyst_EPIC'
  );
  const legendaryCatalyst: Contract = await ethers.getContract(
    'PolygonCatalyst_LEGENDARY'
  );
  const users = await getUnnamedAccounts();
  const {
    deployer,
    catalystMinter,
    gemMinter,
    gemsCatalystsRegistryAdmin,
    upgradeAdmin,
  } = await getNamedAccounts();
  const catalystOwner = users[0];
  const gemOwner = users[0];
  const gemsCatalystsRegistrySuperOperator = users[1];
  const user3 = users[3];

<<<<<<< HEAD
  await deployments.deploy(`PolygonGem_Example`, {
=======
  await deployments.deploy(`Gem_Example`, {
>>>>>>> fixes in deployments
    contract: 'GemV1',
    from: gemOwner,
    log: true, //put initializer
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: '__GemV1_init',
        args: [
          'Gem_Example',
          'Gem_Example',
          gemOwner,
          gemOwner,
          exampleGemId,
          //gemsCatalystsRegistry.address,
        ],
      },
    },
  });

  const gemExample: Contract = await ethers.getContract('PolygonGem_Example');

<<<<<<< HEAD
  await deployments.deploy(`PolygonGem_NotInOrder`, {
=======
  await deployments.deploy(`Gem_NotInOrder`, {
>>>>>>> fixes in deployments
    contract: 'GemV1',
    from: gemOwner,
    log: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: '__GemV1_init',
        args: [
          'Gem_NotInOrder',
          'Gem_NotInOrder',
          gemOwner,
          gemOwner,
          notInOrderGemId,
          //gemsCatalystsRegistry.address,
        ],
      },
    },
  });
  const gemNotInOrder: Contract = await ethers.getContract(
    'PolygonGem_NotInOrder'
  );

  const DefaultAttributes = await deployments.get(`PolygonDefaultAttributes`);

<<<<<<< HEAD
  await deployments.deploy(`PolygonCatalyst_Example`, {
=======
  await deployments.deploy(`Catalyst_Example`, {
>>>>>>> fixes in deployments
    contract: 'CatalystV1',
    from: catalystOwner,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: '__CatalystV1_init',
        args: [
          'Gem_NotInOrder', //name
          'Gem_NotInOrder', //symbol
          catalystOwner, //trustedForwarder
          /* gemsCatalystsRegistry.address, */
          catalystMinter, //admin
          5, //maxGems
          exampleCatalystId, //catalystId
          DefaultAttributes.address, //attributes
        ],
      },
    },
  });

<<<<<<< HEAD
  console.log('catalyst minter address in fixtures');
  console.log(catalystMinter);

=======
>>>>>>> fixes in deployments
  const catalystExample: Contract = await ethers.getContract(
    'PolygonCatalyst_Example'
  );

  const gemsCatalystsUnit = '1000000000000000000';
  const mintingAmount = BigNumber.from('8').mul(
    BigNumber.from(gemsCatalystsUnit)
  );

  console.log('CommonCat');

  const adminRole = await commonCatalyst.DEFAULT_ADMIN_ROLE();
  const boolRole = await commonCatalyst.hasRole(adminRole, catalystMinter);
  console.log(boolRole);

  await commonCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, mintingAmount);

  console.log('RareCat');

  await rareCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, mintingAmount);

  console.log('EpicCat');

  await epicCatalyst
    .connect(ethers.provider.getSigner(catalystMinter))
    .mint(catalystOwner, mintingAmount);

  console.log('LegCat');

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

  const gemsCatalystsRegistryAsCataystOwner = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(catalystOwner)
  );

  const gemsCatalystsRegistryAsRegistrySuperOperator = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemsCatalystsRegistrySuperOperator)
  );

  const gemsCatalystsRegistryAsUser3 = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(users[3])
  );

  const gemsCatalystsRegistryAsRegAdmin = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemsCatalystsRegistryAdmin)
  );

  const gemsCatalystsRegistryAsCataystMinter = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(catalystMinter)
  );

  const gemsCatalystsRegistryAsGemOwner = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemOwner)
  );

  const gemsCatalystsRegistryAsGemMinter = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(gemMinter)
  );

  const gemsCatalystsRegistryAsDeployer = gemsCatalystsRegistry.connect(
    ethers.provider.getSigner(deployer)
  );
  return {
    //sandContract,
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
