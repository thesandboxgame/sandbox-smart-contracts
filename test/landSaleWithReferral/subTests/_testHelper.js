// const {utils} = require("ethers");
// const {toWei} = require("testUtils");
const {BigNumber} = require("ethers");

module.exports.testLands = [
  {
    x: 400,
    y: 106,
    size: 1,
    price: "4047",
    reserved: "",
    salt: "0x1111111111111111111111111111111111111111111111111111111111111111",
  },
  {
    x: 120,
    y: 144,
    size: 12,
    price: "2773",
    salt: "0x1111111111111111111111111111111111111111111111111111111111111112",
  },
  {
    x: 288,
    y: 144,
    size: 12,
    price: "1358",
    salt: "0x1111111111111111111111111111111111111111111111111111111111111113",
  },
  {
    x: 36,
    y: 114,
    size: 6,
    price: "3169",
    salt: "0x1111111111111111111111111111111111111111111111111111111111111114",
  },
  {
    x: 308,
    y: 282,
    size: 1,
    price: "8465",
    salt: "0x1111111111111111111111111111111111111111111111111111111111111115",
  },
  {
    x: 308,
    y: 281,
    size: 1,
    price: "8465",
    salt: "0x1111111111111111111111111111111111111111111111111111111111111116",
  },
];

module.exports.generateUserPermissions = async function (roles, contracts) {
  const {landSaleAdmin, landSaleBeneficiary, landAdmin, sandAdmin, others} = roles;
  const {landSaleWithReferral, land, estate, landSale, sand, fakeDAI} = contracts;
  const LandSaleAdmin = {
    address: landSaleAdmin,
    LandSaleWithReferral: landSaleWithReferral.connect(landSaleWithReferral.provider.getSigner(landSaleAdmin)),
    Land: land.connect(landSaleWithReferral.provider.getSigner(landSaleAdmin)),
    Estate: estate.connect(estate.provider.getSigner(landSaleAdmin)),
    LandSale: landSale.connect(landSale.provider.getSigner(landSaleAdmin)),
    Sand: sand.connect(sand.provider.getSigner(landSaleAdmin)),
    FakeDAI: fakeDAI.connect(fakeDAI.provider.getSigner(landSaleAdmin)),
  };

  const LandSaleBeneficiary = {
    address: landSaleBeneficiary,
    LandSaleWithReferral: landSaleWithReferral.connect(landSaleWithReferral.provider.getSigner(landSaleBeneficiary)),
    Land: land.connect(land.provider.getSigner(landSaleBeneficiary)),
    Estate: estate.connect(estate.provider.getSigner(landSaleBeneficiary)),
    LandSale: landSale.connect(landSale.provider.getSigner(landSaleBeneficiary)),
    Sand: sand.connect(sand.provider.getSigner(landSaleBeneficiary)),
    FakeDAI: fakeDAI.connect(fakeDAI.provider.getSigner(landSaleBeneficiary)),
  };

  const LandAdmin = {
    address: landAdmin,
    LandSaleWithReferral: landSaleWithReferral.connect(landSaleWithReferral.provider.getSigner(landAdmin)),
    Land: land.connect(landSaleWithReferral.provider.getSigner(landAdmin)),
    Estate: estate.connect(estate.provider.getSigner(landAdmin)),
    LandSale: landSale.connect(landSale.provider.getSigner(landAdmin)),
    Sand: sand.connect(sand.provider.getSigner(landAdmin)),
    FakeDAI: fakeDAI.connect(fakeDAI.provider.getSigner(landAdmin)),
  };

  const SandAdmin = {
    address: sandAdmin,
    LandSaleWithReferral: landSaleWithReferral.connect(landSaleWithReferral.provider.getSigner(sandAdmin)),
    Land: land.connect(landSaleWithReferral.provider.getSigner(sandAdmin)),
    Estate: estate.connect(estate.provider.getSigner(sandAdmin)),
    LandSale: landSale.connect(landSale.provider.getSigner(sandAdmin)),
    Sand: sand.connect(sand.provider.getSigner(sandAdmin)),
    FakeDAI: fakeDAI.connect(fakeDAI.provider.getSigner(sandAdmin)),
  };

  const users = [];
  for (const other of others) {
    users.push({
      address: other,
      LandSaleWithReferral: landSaleWithReferral.connect(landSaleWithReferral.provider.getSigner(other)),
      Land: land.connect(landSaleWithReferral.provider.getSigner(other)),
      Estate: estate.connect(estate.provider.getSigner(other)),
      LandSale: landSale.connect(landSale.provider.getSigner(other)),
      Sand: sand.connect(sand.provider.getSigner(other)),
      FakeDAI: fakeDAI.connect(fakeDAI.provider.getSigner(other)),
    });
  }
  return {LandSaleAdmin, LandSaleBeneficiary, LandAdmin, SandAdmin, users};
};

module.exports.setupUser = async function (SandAdmin, contracts, user, {hasSand, hasDAI}) {
  if (hasDAI) {
    // TODO: give the user some DAI
  }
  if (hasSand) {
    await SandAdmin.Sand.transfer(user.address, BigNumber.from('1000000000000000000000000'));
  }
  return user;
};
