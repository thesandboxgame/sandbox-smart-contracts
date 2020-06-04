const {toWei, findEvents, waitFor} = require("local-utils");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

const dummyHash = "0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF";

module.exports.setupCatalystSystem = deployments.createFixture(async () => {
  const {gemCoreMinter, catalystMinter, others, sandBeneficiary} = await getNamedAccounts();
  await deployments.fixture();
  const users = [];
  for (const other of others) {
    const CatalystMinter = await ethers.getContract("CatalystMinter", other);
    users.push({
      address: other,
      CatalystMinter,
      GemCore: await ethers.getContract("GemCore", other),
      // TODO catalysts and gems
      Asset: await ethers.getContract("Asset", other),
      mintAsset: async ({catalyst, packId, ipfsHash, gemIds, quantity, to}) => {
        const receipt = await waitFor(
          CatalystMinter.mint(other, packId || 0, ipfsHash || dummyHash, catalyst, gemIds, quantity, to || other, "0x")
        );
        const events = await findEvents(asset, "TransferSingle", receipt.blockHash);
        return events[0].args.id;
      },
    });
  }
  const gemCore = await ethers.getContract("GemCore", gemCoreMinter);
  const catalysts = {};
  for (const name of ["Common", "Rare", "Epic", "Legendary"]) {
    catalysts[name] = await ethers.getContract(`${name}Catalyst`, catalystMinter);
  }
  const gems = {};
  for (const name of ["Power", "Defense", "Speed", "Magic", "Luck"]) {
    gems[name] = await ethers.getContract(`${name}Gem`);
  }
  const sand = await ethers.getContract("Sand", sandBeneficiary);
  const asset = await ethers.getContract("Asset");
  return {
    users,
    gemCore,
    catalysts,
    gems,
    sand,
    asset,
    catalystRegistry: await ethers.getContract("CatalystRegistry"),
  };
});

module.exports.setupCatalystUsers = deployments.createFixture(async () => {
  const setup = await this.setupCatalystSystem();
  const {users, gemCore, catalysts, sand} = setup;
  async function setupUser(creator, {hasSand, hasGems, hasCatalysts}) {
    if (hasSand) {
      await sand.transfer(creator.address, toWei(1000));
    }
    if (hasGems) {
      for (let i = 0; i < 5; i++) {
        await gemCore.mint(creator.address, i, 10);
      }
    }
    if (hasCatalysts) {
      for (const name of ["Common", "Rare", "Epic", "Legendary"]) {
        await catalysts[name].mint(creator.address, 10);
      }
    }
    return creator;
  }
  const creator = await setupUser(users[0], {hasSand: true, hasGems: true, hasCatalysts: true});
  const creatorWithoutGems = await setupUser(users[1], {hasSand: true, hasGems: false, hasCatalysts: true});
  const creatorWithoutCatalyst = await setupUser(users[1], {hasSand: true, hasGems: true, hasCatalysts: false});
  const creatorWithoutSand = await setupUser(users[1], {hasSand: false, hasGems: true, hasCatalysts: true});
  return {
    ...setup,
    creator,
    creatorWithoutGems,
    creatorWithoutCatalyst,
    creatorWithoutSand,
  };
});
