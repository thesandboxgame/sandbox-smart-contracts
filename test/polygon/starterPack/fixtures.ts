import {ethers, getNamedAccounts, getUnnamedAccounts} from 'hardhat';
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
    } = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();

    const PolygonStarterPack = await ethers.getContract('PolygonStarterPack');

    const PolygonStarterPackAsAdmin = await ethers.getContract(
      'PolygonStarterPack',
      starterPackAdmin
    );

    const defaultAdminRole = await PolygonStarterPack.DEFAULT_ADMIN_ROLE();

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

    return {
      PolygonStarterPack,
      PolygonStarterPackAsAdmin,
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
      hre,
    };
  }
);
