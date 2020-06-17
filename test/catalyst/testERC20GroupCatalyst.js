const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const erc20GroupTests = require("../erc20Group")(
  async () => {
    const {others, catalystMinter, deployer} = await getNamedAccounts();
    await deployments.fixture();

    const contract = await ethers.getContract("Catalyst", catalystMinter);

    // Catalysts
    // {
    //   name: "Common",
    //   symbol: "COMMON",
    //   sandFee: sandWei(1),
    //   rarity: 0,
    //   maxGems: 1,
    //   quantityRange: [200, 1000],
    //   attributeRange: [1, 25],
    // },
    // {
    //   name: "Rare",
    //   symbol: "RARE",
    //   sandFee: sandWei(4),
    //   rarity: 1,
    //   maxGems: 2,
    //   quantityRange: [50, 200],
    //   attributeRange: [26, 50],
    // },
    // {
    //   name: "Epic",
    //   symbol: "EPIC",
    //   sandFee: sandWei(10),
    //   rarity: 2,
    //   maxGems: 3,
    //   quantityRange: [10, 50],
    //   attributeRange: [51, 75],
    // },
    // {
    //   name: "Legendary",
    //   symbol: "LEGENDARY",
    //   sandFee: sandWei(200),
    //   rarity: 3,
    //   maxGems: 4,
    //   quantityRange: [1, 10],
    //   attributeRange: [76, 100],
    // },

    const ERC20SubTokenCommon = await ethers.getContract("CommonCatalyst");
    const ERC20SubTokenRare = await ethers.getContract("RareCatalyst");
    const ERC20SubTokenEpic = await ethers.getContract("EpicCatalyst");
    const ERC20SubTokenLegendary = await ethers.getContract("LegendaryCatalyst");

    async function mint(to, amount) {
      const tx = await contract.mint(to, 1, amount);
      const receipt = await tx.wait();
      return {receipt};
    }
    async function batchMint(to, amount) {
      const tx = await contract.batchMint(to, [1, 2, 3], amount);
      const receipt = await tx.wait();
      return {receipt};
    }
    return {
      ethereum,
      contractAddress: contract.address,
      users: others,
      mint,
      batchMint,
      deployer,
      ERC20SubToken: ERC20SubTokenRare, // index 1
      secondERC20SubToken: ERC20SubTokenEpic, // index 2
      thirdERC20SubToken: ERC20SubTokenLegendary, // index 3
    };
  },
  {
    burn: true,
  }
);

function recurse(test) {
  if (test.subTests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    describe(test.title, function () {
      // eslint-disable-next-line mocha/no-setup-in-describe
      for (const subTest of test.subTests) {
        // eslint-disable-next-line mocha/no-setup-in-describe
        recurse(subTest);
      }
    });
  } else {
    it(test.title, test.test);
  }
}

describe("Catalysts:ERC20Group", function () {
  for (const test of erc20GroupTests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
