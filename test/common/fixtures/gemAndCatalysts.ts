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
  const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER_V2');
  const sandContract: Contract = await ethers.getContract('PolygonSand');
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
    catalystAdmin,
    assetAdmin,
  } = await getNamedAccounts();
  const catalystOwner = users[0];
  const gemOwner = users[0];
  const gemsCatalystsRegistrySuperOperator = users[1];
  const user3 = users[3];

  await deployments.deploy(`PolygonGem_Example`, {
    contract: 'GemV1',
    from: gemOwner,
    log: true,
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OptimizedTransparentProxy',
      execute: {
        methodName: '__GemV1_init',
        args: [
          'Gem_Example',
          'Gem_Example',
          deployer,
          gemMinter,
          exampleGemId,
          gemsCatalystsRegistry.address,
        ],
      },
    },
  });

  const gemExample: Contract = await ethers.getContract('PolygonGem_Example');

  await deployments.deploy(`PolygonGem_NotInOrder`, {
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
          deployer,
          gemMinter,
          notInOrderGemId,
          gemsCatalystsRegistry.address,
        ],
      },
    },
  });
  const gemNotInOrder: Contract = await ethers.getContract(
    'PolygonGem_NotInOrder'
  );

  const DefaultAttributes = await deployments.get(`PolygonDefaultAttributes`);

  await deployments.deploy(`PolygonCatalyst_Example`, {
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
          deployer, //trustedForwarder
          catalystAdmin, //admin
          5, //maxGems
          exampleCatalystId, //catalystId
          DefaultAttributes.address, //attributes
          gemsCatalystsRegistry.address,
        ],
      },
    },
  });
  const catalystExample: Contract = await ethers.getContract(
    'PolygonCatalyst_Example'
  );
  const gemsCatalystsUnit = '1000000000000000000';
  const mintingAmount = BigNumber.from('8').mul(
    BigNumber.from(gemsCatalystsUnit)
  );

  await commonCatalyst
    .connect(ethers.provider.getSigner(catalystAdmin))
    .mint(catalystOwner, mintingAmount);

  await rareCatalyst
    .connect(ethers.provider.getSigner(catalystAdmin))
    .mint(catalystOwner, mintingAmount);

  await epicCatalyst
    .connect(ethers.provider.getSigner(catalystAdmin))
    .mint(catalystOwner, mintingAmount);

  await legendaryCatalyst
    .connect(ethers.provider.getSigner(catalystAdmin))
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

  //need to read the SUPER_OPERATOR_ROLE
  const superOperator = await gemsCatalystsRegistry.SUPER_OPERATOR_ROLE();

  await gemsCatalystsRegistry
    .connect(ethers.provider.getSigner(assetAdmin))
    .grantRole(superOperator, gemsCatalystsRegistrySuperOperator);

  const gemsCatalystsRegistryAsCatalystOwner = gemsCatalystsRegistry.connect(
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

  const gemsCatalystsRegistryAsCatalystMinter = gemsCatalystsRegistry.connect(
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
    gemsCatalystsRegistryAsCatalystOwner,
    gemsCatalystsRegistryAsRegistrySuperOperator,
    gemsCatalystsRegistryAsUser3,
    gemsCatalystsRegistryAsRegAdmin,
    gemsCatalystsRegistryAsCatalystMinter,
    gemsCatalystsRegistryAsGemOwner,
    gemsCatalystsRegistryAsGemMinter,
    gemsCatalystsRegistryAsDeployer,
    trustedForwarder,
    deployer,
    upgradeAdmin,
  };
};
