const {expect} = require("chai");
const {ethers, deployments, getNamedAccounts} = require("@nomiclabs/buidler");
const {BigNumber} = require("ethers");

function cbrt6(a) {
  a = BigNumber.from(a);
  a = a.mul("1000000000000000000");
  let tmp = a.add(2).div(3);
  let c = BigNumber.from(a);
  while (tmp.lt(c)) {
    c = BigNumber.from(tmp);
    const tmpSquare = tmp.pow(2);
    tmp = a.div(tmpSquare).add(tmp.mul(2)).div(3);
  }
  return c;
}

function rt6_3(a) {
  a = BigNumber.from(a);
  a = a.mul("1000000000000000000");
  let tmp = a.add(5).div(6);
  let c = BigNumber.from(a);
  while (tmp.lt(c)) {
    c = BigNumber.from(tmp);
    const tmpFive = tmp.pow(5);
    tmp = a.div(tmpFive).add(tmp.mul(5)).div(6);
  }
  return c;
}

BigNumber.prototype.cbrt6 = function () {
  return cbrt6(this);
};

BigNumber.prototype.rt6_3 = function () {
  return rt6_3(this);
};

const NFT_FACTOR_6 = BigNumber.from("10000");
const NFT_CONSTANT_6 = BigNumber.from("9000000");
const ROOT3_FACTOR = BigNumber.from(697);
const ROOT6_FACTOR = BigNumber.from(48000000);
const DECIMAL_12 = BigNumber.from("1000000000000");

function contribution1(amountStaked, numLands) {
  amountStaked = BigNumber.from(amountStaked);
  numLands = BigNumber.from(numLands);
  if (numLands.eq(0)) {
    return amountStaked;
  }
  return amountStaked.add(amountStaked.mul(NFT_FACTOR_6).mul(NFT_CONSTANT_6.add(numLands.cbrt6())).div(DECIMAL_12));
}

function contribution2(amountStaked, numLands) {
  amountStaked = BigNumber.from(amountStaked);
  numLands = BigNumber.from(numLands);
  if (numLands.eq(0)) {
    return amountStaked;
  }
  return amountStaked.add(
    amountStaked
      .mul(NFT_FACTOR_6)
      .mul(NFT_CONSTANT_6.add(numLands.sub(1).mul(ROOT3_FACTOR).add(1).cbrt6()))
      .div(DECIMAL_12)
  );
}

function contribution3(amountStaked, numLands) {
  amountStaked = BigNumber.from(amountStaked);
  numLands = BigNumber.from(numLands);
  if (numLands.eq(0)) {
    return amountStaked;
  }
  return amountStaked.add(
    amountStaked
      .mul(NFT_FACTOR_6)
      .mul(NFT_CONSTANT_6.add(numLands.sub(1).mul(ROOT6_FACTOR).add(1).rt6_3().mul(1000)))
      .div(DECIMAL_12)
  );
}

const valuesToTests = [
  {
    amountStaked: 1000,
    numLands: 0,
  },
  {
    amountStaked: 1000,
    numLands: 1,
  },
  {
    amountStaked: 1000,
    numLands: 3,
  },
  {
    amountStaked: 1000,
    numLands: 9,
  },
  {
    amountStaked: 1000,
    numLands: 10,
  },
  {
    amountStaked: 1000,
    numLands: 122,
  },
  {
    amountStaked: 1000,
    numLands: 100,
    expectedContribution3: 1500,
    expectedContribution2: 1500,
  },
  {
    amountStaked: 1000,
    numLands: 10000,
  },
];

describe("SafeMathWithRequire", function () {
  it("cbrt6", async function () {
    expect(cbrt6(0)).to.equal(0);
    expect(cbrt6(1)).to.equal(1000000);
    expect(cbrt6(2)).to.equal(1259921);
    expect(cbrt6(4)).to.equal(1587401);
    expect(cbrt6(8)).to.equal(2000000);
    expect(cbrt6(10)).to.equal(2154434);
    expect(cbrt6(20)).to.equal(2714417);
    expect(cbrt6(50)).to.equal(3684031);
    expect(cbrt6(100)).to.equal(4641588);
    expect(cbrt6(1000)).to.equal(10000000);
  });

  it("rt6_3", async function () {
    expect(rt6_3(0)).to.equal(0);
    expect(rt6_3(1)).to.equal(1000);
    expect(rt6_3(2)).to.equal(1122);
    expect(rt6_3(4)).to.equal(1259);
    expect(rt6_3(8)).to.equal(1414);
    expect(rt6_3(10)).to.equal(1467);
    expect(rt6_3(20)).to.equal(1647);
    expect(rt6_3(50)).to.equal(1919);
    expect(rt6_3(100)).to.equal(2154);
    expect(rt6_3(1000)).to.equal(3162);
  });
});

describe("LandWeightedSANDRewardPool computation", function () {
  it("computing contributions v1", async function () {
    await deployments.fixture();
    const contract = await ethers.getContract("LandWeightedSANDRewardPool");
    for (const values of valuesToTests) {
      const result = await contract.computeContribution1(values.amountStaked, values.numLands);
      expect(result).to.equal(contribution1(values.amountStaked, values.numLands));
      if (values.expectedContribution1) {
        expect(result).to.equal(values.expectedContribution1);
      }
    }
  });

  it("computing contributions v2", async function () {
    await deployments.fixture();
    const contract = await ethers.getContract("LandWeightedSANDRewardPool");
    for (const values of valuesToTests) {
      const result = await contract.computeContribution2(values.amountStaked, values.numLands);
      expect(result).to.equal(contribution2(values.amountStaked, values.numLands));
      if (values.expectedContribution2) {
        expect(result).to.equal(values.expectedContribution2);
      }
    }
  });

  it("computing contributions v3", async function () {
    await deployments.fixture();
    const contract = await ethers.getContract("LandWeightedSANDRewardPool");
    for (const values of valuesToTests) {
      const result = await contract.computeContribution3(values.amountStaked, values.numLands);
      expect(result).to.equal(contribution3(values.amountStaked, values.numLands));
      if (values.expectedContribution3) {
        expect(result).to.equal(values.expectedContribution3);
      }
    }
  });
});
