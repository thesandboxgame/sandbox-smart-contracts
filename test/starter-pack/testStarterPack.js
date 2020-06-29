const {setupStarterPack} = require("./fixtures");
const {assert} = require("chai");
const {ethers} = require("@nomiclabs/buidler");
const starterPackJSON = require("../../artifacts/StarterPack.json");
const starterPackABI = starterPackJSON.abi;
const starterPackbytecode = starterPackJSON.bytecode;

let starterPack;

async function deployStarterPack() {
  const [wallet, admin] = await ethers.getSigners();
  const StarterPack = await ethers.getContractFactory(starterPackABI, starterPackbytecode, wallet);
  const adminAddress = await admin.getAddress();
  starterPack = await StarterPack.deploy(adminAddress);
  await starterPack.deployed();
  return {starterPack};
}

describe("StarterPack: Setup", function () {
  it.only("Returns a starterPack contract", async function () {
    const starterPack = await setupStarterPack();
    console.log(`starterPack: ${starterPack}`);
    // const {starterPack} = await deployStarterPack();
    console.log(`starterPack deployed at: ${starterPack.address}`);
    assert.notEqual(starterPack.address, undefined);
  }); // Passing

  it("should set the admin address correctly", async function () {
    const [wallet, admin] = await ethers.getSigners();
    const returnedAdmin = await starterPack.getAdmin();
    const configAdminAddress = await admin.getAddress();
    assert.equal(returnedAdmin, configAdminAddress);
  }); // Passing
});

describe("Purchase", function () {
  it.skip("can call the purchase function", async function () {
    const [wallet, admin, from, to] = await ethers.getSigners();
    const tx = await starterPack.purchase(from, to, [1, 1, 1, 1], [1, 2, 3, 4, 0], 11, ["0x0"]);
    await tx.wait();
  });

  it.skip("should invalidate the nonce after 1 use", async function () {});

  it.skip("should emit the Purchase event", async function () {});

  it.skip("should fail if the nonce is reused", async function () {});

  it.skip("should fail if ...", async function () {});
});

describe("SetPrices", function () {
  it.skip("should fail if called by other than the admin address", async function () {});
});

describe("WithdrawAll", function () {
  it.skip("should fail if called by other than the admin address", async function () {});
});
