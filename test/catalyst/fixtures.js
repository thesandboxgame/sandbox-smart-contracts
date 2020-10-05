const {toWei, waitFor} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("@ethersproject/bignumber");

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

module.exports.setupCatalystSystem = deployments.createFixture(async (bre, options) => {
  const {
    deployer,
    gemMinter,
    catalystMinter,
    others,
    sandBeneficiary,
    catalystMinterAdmin,
    catalystAdmin,
    catalystRegistryAdmin,
    gemAdmin,
    sandAdmin,
    assetAdmin,
  } = await getNamedAccounts();
  await deployments.fixture();
  options = options || {};
  const {gemAdditionFee, catalystConfig, mintingFeeCollector} = options;

  const catalystRegistry = await ethers.getContract("CatalystRegistry", catalystRegistryAdmin);
  const gem = await ethers.getContract("Gem", gemMinter);
  const gemAsAdmin = await ethers.getContract("Gem", gemAdmin);
  const catalystAsAdmin = await ethers.getContract(`Catalyst`, catalystAdmin);
  const catalyst = await ethers.getContract(`Catalyst`, catalystMinter);
  const sand = await ethers.getContract("Sand", sandBeneficiary);
  const sandAsAdmin = await ethers.getContract("Sand", sandAdmin);
  const asset = await ethers.getContract("Asset", assetAdmin);

  if (catalystConfig !== undefined) {
    for (let i = 0; i < catalystConfig.length; i++) {
      const config = catalystConfig[i];
      if (config !== undefined) {
        await catalystAsAdmin.setConfiguration(
          i,
          config.minQuantity,
          config.maxQuantity,
          config.sandMintingFee,
          config.sandUpdateFee
        );
      }
    }

    const bakedMintData = [];
    for (let i = 0; i < 4; i++) {
      const mintData = await deployments.read("Catalyst", "getMintData", i);
      const maxGems = BigNumber.from(mintData.maxGems).mul(BigNumber.from(2).pow(240));
      const minQuantity = BigNumber.from(mintData.minQuantity).mul(BigNumber.from(2).pow(224));
      const maxQuantity = BigNumber.from(mintData.maxQuantity).mul(BigNumber.from(2).pow(208));
      const sandMintingFee = BigNumber.from(mintData.sandMintingFee).mul(BigNumber.from(2).pow(120));
      const sandUpdateFee = BigNumber.from(mintData.sandUpdateFee);
      const bakedData = sandUpdateFee.add(sandMintingFee).add(maxGems).add(minQuantity).add(maxQuantity);
      bakedMintData.push(bakedData);
    }
    const catalystMinterDeployment = await deployments.deploy("CatalystMinter", {
      from: deployer,
      gas: 3000000,
      args: [
        catalystRegistry.address,
        sand.address,
        asset.address,
        gem.address,
        sand.address,
        catalystMinterAdmin,
        mintingFeeCollector || "0x0000000000000000000000000000000000000000",
        gemAdditionFee || 0,
        catalyst.address,
        bakedMintData,
      ],
    });
    await catalystRegistry.setMinter(catalystMinterDeployment.address);
    await asset.setBouncer(catalystMinterDeployment.address, true);

    await sandAsAdmin.setSuperOperator(catalystMinterDeployment.address, true);
    await gemAsAdmin.setSuperOperator(catalystMinterDeployment.address, true);
    await asset.setSuperOperator(catalystMinterDeployment.address, true);
    await catalystAsAdmin.setSuperOperator(catalystMinterDeployment.address, true);
  }
  const catalystMinterContract = await ethers.getContract(`CatalystMinter`, catalystMinterAdmin);

  if (catalystConfig === undefined && gemAdditionFee !== undefined) {
    await catalystMinterContract.setGemAdditionFee(gemAdditionFee);
  }

  const users = [];
  for (const other of others) {
    const CatalystMinter = await ethers.getContract("CatalystMinter", other);
    const Asset = await ethers.getContract("Asset", other);
    const Gem = await ethers.getContract("Gem", other);
    users.push({
      address: other,
      CatalystMinter,
      Gem,
      Asset,
      mintAsset: async ({catalyst, packId, ipfsHash, gemIds, quantity, to}) => {
        const receipt = await waitFor(
          CatalystMinter.mint(other, packId || 0, ipfsHash || dummyHash, catalyst, gemIds, quantity, to || other, "0x")
        );
        const events = await findEvents(asset, "TransferSingle", receipt.blockHash);
        return {tokenId: events[0].args.id, receipt};
      },
      extractAndChangeCatalyst: async (tokenId, {catalyst, gemIds, to}) => {
        const receipt = await waitFor(
          CatalystMinter.extractAndChangeCatalyst(other, tokenId, catalyst, gemIds, to || other)
        );
        const events = await findEvents(asset, "Transfer", receipt.blockHash);
        return {tokenId: events[0].args[2], receipt};
      },
      changeCatalyst: async (tokenId, {catalyst, gemIds, to}) => {
        const receipt = await waitFor(CatalystMinter.changeCatalyst(other, tokenId, catalyst, gemIds, to || other));
        return {receipt};
      },
      extractAndAddGems: async (tokenId, {newGemIds, to}) => {
        const receipt = await waitFor(CatalystMinter.extractAndAddGems(other, tokenId, newGemIds, to || other));
        const events = await findEvents(asset, "Transfer", receipt.blockHash);
        return {tokenId: events[0].args[2], receipt};
      },
      addGems: async (tokenId, {newGemIds, to}) => {
        const receipt = await waitFor(CatalystMinter.addGems(other, tokenId, newGemIds, to || other));
        return {receipt};
      },
      extractAsset: async (tokenId, to) => {
        const receipt = await waitFor(Asset.extractERC721(tokenId, to || other));
        const events = await findEvents(asset, "Transfer", receipt.blockHash);
        return {tokenId: events[0].args[2], receipt};
      },
    });
  }
  return {
    users,
    gem,
    catalyst,
    sand,
    asset,
    catalystMinterContract,
    catalystRegistry: await ethers.getContract("CatalystRegistry"),
  };
});

module.exports.setupCatalystUsers = deployments.createFixture(async (bre, options) => {
  const setup = await this.setupCatalystSystem(options);
  const {users, gem, catalyst, sand} = setup;
  async function setupUser(creator, {hasSand, hasGems, hasCatalysts}) {
    if (hasSand) {
      await sand.transfer(creator.address, toWei(10000));
    }
    if (hasGems) {
      for (let i = 0; i < 5; i++) {
        await gem.mint(creator.address, i, 50);
      }
    }
    if (hasCatalysts) {
      for (let i = 0; i < 4; i++) {
        await catalyst.mint(creator.address, i, 20);
      }
    }
    return creator;
  }
  const creator = await setupUser(users[0], {hasSand: true, hasGems: true, hasCatalysts: true});
  const creatorWithoutGems = await setupUser(users[1], {hasSand: true, hasGems: false, hasCatalysts: true});
  const creatorWithoutCatalyst = await setupUser(users[2], {hasSand: true, hasGems: true, hasCatalysts: false});
  const creatorWithoutSand = await setupUser(users[3], {hasSand: false, hasGems: true, hasCatalysts: true});
  const user = await setupUser(users[4], {hasSand: true, hasGems: true, hasCatalysts: true});
  return {
    ...setup,
    user,
    creator,
    creatorWithoutGems,
    creatorWithoutCatalyst,
    creatorWithoutSand,
  };
});
