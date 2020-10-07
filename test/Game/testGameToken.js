const {ethers, getNamedAccounts, deployments} = require("@nomiclabs/buidler");
const {utils, BigNumber, Wallet} = require("ethers");
const {assert, expect} = require("local-chai");
const {expectRevert, waitFor} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {setupTest} = require("./fixtures");

let signers;
let userWithSand;

describe("GameToken", function () {
  it("deploys the GameToken contract", async function () {
    const {gameToken} = await setupTest();
    await gameToken.setNumber(42);
    const number = await gameToken._number();
    assert.equal(number, 42);
  });
});
