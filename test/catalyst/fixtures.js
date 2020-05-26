const {BigNumber} = require("ethers");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");

function toSandWei(number) {
  return BigNumber.from(number).mul("100000000000000000");
}

module.exports.setupCatalystSystem = deployments.createFixture(async () => {
  const {gemCoreMinter, catalystMinter, others, sandBeneficiary} = await getNamedAccounts();
  await deployments.fixture();
  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      CatalystMinter: await ethers.getContract("CatalystMinter", other),
      GemCore: await ethers.getContract("GemCore", other),
      // TODO catalysts
      Asset: await ethers.getContract("Asset", other),
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
  };
});

module.exports.setupCatalystUsers = deployments.createFixture(async () => {
  const {users, gemCore, catalysts, sand, asset, gems} = await this.setupCatalystSystem();
  async function setupUser(creator, {hasSand, hasGems, hasCatalysts}) {
    if (hasSand) {
      await sand.transfer(creator.address, toSandWei(1000));
    }
    if (hasGems) {
      for (let i = 0; i < 5; i++) {
        await gemCore.mint(creator.address, 0, 10);
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
    creator,
    creatorWithoutGems,
    creatorWithoutCatalyst,
    creatorWithoutSand,
    users: users.slice(4),
    asset,
    sand,
    gemCore,
    catalysts,
    gems,
  };
});
