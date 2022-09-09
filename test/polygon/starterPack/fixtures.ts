import {
  ethers,
  deployments,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {withSnapshot, setupUser} from '../../utils';
import {gemsAndCatalystsFixtures} from '../../common/fixtures/gemAndCatalysts';
import {BigNumber} from 'ethers';
import {depositViaChildChainManager} from '../../polygon/sand/fixtures';

export const setupPolygonStarterPack = withSnapshot(
  [
    'PolygonStarterPack',
    'PolygonGemsCatalystsRegistry',
    'PolygonCatalysts',
    'PolygonSand',
    'PolygonGems',
    'PolygonGemsCatalystsRegistry_setup',
  ],
  async function (hre) {
    // Reuse existing cats & gems fixture
    const {
      sandContract,
      gemsCatalystsRegistry,
      powerGem,
      defenseGem,
      speedGem,
      magicGem,
      luckGem,
      commonCatalyst,
      rareCatalyst,
      epicCatalyst,
      legendaryCatalyst,
      catalystOwner, // users[0]
      gemOwner, // users[0]
      catalystMinter,
      gemMinter,
    } = await gemsAndCatalystsFixtures();

    // Create new test setup for PolygonStarterPack
    const {
      starterPackAdmin,
      starterPackSaleBeneficiary,
      backendMessageSigner,
      sandAdmin,
      upgradeAdmin,
      gemsCatalystsRegistryAdmin,
    } = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();

    const PolygonStarterPack = await ethers.getContract('PolygonStarterPack');

    // DEFAULT_ADMIN_ROLE
    const PolygonStarterPackAsAdmin = await ethers.getContract(
      'PolygonStarterPack',
      sandAdmin
    );

    // STARTERPACK_ROLE
    const PolygonStarterPackAsStarterPackAdmin = await ethers.getContract(
      'PolygonStarterPack',
      starterPackAdmin
    );

    const defaultAdminRole = await PolygonStarterPack.DEFAULT_ADMIN_ROLE();

    const starterPackRole = await PolygonStarterPack.STARTERPACK_ROLE();

    // Mint 100 of each type of cat & gem to StarterPack contract --------
    const gemsCatalystsUnit = '1000000000000000000';
    const mintingAmount = BigNumber.from('100').mul(
      BigNumber.from(gemsCatalystsUnit)
    );

    await commonCatalyst
      .connect(ethers.provider.getSigner(catalystMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await rareCatalyst
      .connect(ethers.provider.getSigner(catalystMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await epicCatalyst
      .connect(ethers.provider.getSigner(catalystMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await legendaryCatalyst
      .connect(ethers.provider.getSigner(catalystMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await powerGem
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await defenseGem
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await speedGem
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await magicGem
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(PolygonStarterPack.address, mintingAmount);

    await luckGem
      .connect(ethers.provider.getSigner(gemMinter))
      .mint(PolygonStarterPack.address, mintingAmount);
    // -----------------------------------------------

    const buyer = await setupUser(unnamedAccounts[3], {
      PolygonStarterPack,
      sandContract,
    }); // several users are already taken by cats & gems fixture
    // buyer is given sand

    const other = await setupUser(unnamedAccounts[4], {
      PolygonStarterPack,
      sandContract,
    }); // has 0 sand

    // Give the buyer some SAND. Note: the only way to deposit PolygonSand in L2 is via the childChainManager
    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
    const sandAmount = BigNumber.from(100000).mul('1000000000000000000');
    await depositViaChildChainManager(
      {sand: sandContract, childChainManager},
      buyer.address,
      sandAmount
    );

    const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER_V2');

    const deployManyGemContracts = async (amount: number) => {
      const gemsToAdd = [];
      // IDs 1-5 already taken by Gems so start at ID 6
      for (let i = 6; i < amount + 6; i++) {
        await deployments.deploy(`TestPolygonGem_${i}`, {
          contract: 'GemV1',
          from: gemOwner,
          log: true,
          proxy: {
            owner: upgradeAdmin,
            proxyContract: 'OptimizedTransparentProxy',
            execute: {
              methodName: '__GemV1_init',
              args: [
                `TestPolygonGem_${i}`,
                `TestPolygonGem_${i}`,
                trustedForwarder.address,
                gemMinter,
                i,
                gemsCatalystsRegistry.address,
              ],
            },
          },
        });
        // Mint gems to StarterPack
        const contract = await ethers.getContract(`TestPolygonGem_${i}`);
        await contract
          .connect(ethers.provider.getSigner(catalystMinter))
          .mint(PolygonStarterPack.address, mintingAmount);

        // Add to registry
        const {address} = await deployments.get(`TestPolygonGem_${i}`);
        gemsToAdd.push(address);
      }
      const registry = await ethers.getContract(`PolygonGemsCatalystsRegistry`);
      await registry
        .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
        .addGemsAndCatalysts(gemsToAdd, []);
    };

    const DefaultAttributes = await deployments.get(`PolygonDefaultAttributes`);

    const deployManyCatalystContracts = async (amount: number) => {
      const catalystsToAdd = [];
      // IDs 1-4 already taken by Cats so start at ID 5
      for (let i = 5; i < amount + 5; i++) {
        await deployments.deploy(`TestPolygonCatalyst_${i}`, {
          contract: 'CatalystV1',
          from: catalystOwner,
          log: true,
          proxy: {
            owner: upgradeAdmin,
            proxyContract: 'OptimizedTransparentProxy',
            execute: {
              methodName: '__CatalystV1_init',
              args: [
                `TestPolygonCatalyst_${i}`,
                `TestPolygonCatalyst_${i}`,
                trustedForwarder.address,
                catalystMinter,
                5,
                i,
                DefaultAttributes.address,
                gemsCatalystsRegistry.address,
              ],
            },
          },
        });
        // Mint gems to StarterPack
        const contract = await ethers.getContract(`TestPolygonCatalyst_${i}`);
        await contract
          .connect(ethers.provider.getSigner(catalystMinter))
          .mint(PolygonStarterPack.address, mintingAmount);

        // Add to registry
        const {address} = await deployments.get(`TestPolygonCatalyst_${i}`);
        catalystsToAdd.push(address);
      }
      const registry = await ethers.getContract(`PolygonGemsCatalystsRegistry`);
      await registry
        .connect(ethers.provider.getSigner(gemsCatalystsRegistryAdmin))
        .addGemsAndCatalysts([], catalystsToAdd);
    };

    return {
      PolygonStarterPack,
      PolygonStarterPackAsAdmin,
      PolygonStarterPackAsStarterPackAdmin,
      starterPackAdmin,
      starterPackSaleBeneficiary,
      backendMessageSigner,
      defaultAdminRole,
      sandContract,
      gemsCatalystsRegistry,
      powerGem,
      defenseGem,
      speedGem,
      magicGem,
      luckGem,
      commonCatalyst,
      rareCatalyst,
      epicCatalyst,
      legendaryCatalyst,
      catalystOwner, // [0]
      gemOwner, // [0]
      buyer, // [3]
      other,
      trustedForwarder,
      sandAdmin,
      starterPackRole,
      hre,
      deployManyGemContracts,
      deployManyCatalystContracts,
    };
  }
);
