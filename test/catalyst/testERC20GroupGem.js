const {ethers, getNamedAccounts, ethereum} = require("@nomiclabs/buidler");
const erc20GroupTests = require("../erc20Group")(
  async () => {
    const {others, gemMinter} = await getNamedAccounts();
    await deployments.fixture();

    const contract = await ethers.getContract("Gem", gemMinter);

    // Gem ERC20SubToken contracts: "Power", "Defense", "Speed", "Magic", "Luck"
    const ERC20SubTokenPower = await ethers.getContract("PowerGem");
    const ERC20SubTokenDefense = await ethers.getContract("DefenseGem");
    const ERC20SubTokenSpeed = await ethers.getContract("SpeedGem");
    const ERC20SubTokenMagic = await ethers.getContract("MagicGem");
    const ERC20SubTokenLuck = await ethers.getContract("LuckGem");

    const sandContract = await ethers.getContract("Sand");

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
      minter: gemMinter,
      users: others,
      admin: sandContract.address,
      mint,
      batchMint,
      ERC20SubToken: ERC20SubTokenDefense, // index 1
      secondERC20SubToken: ERC20SubTokenSpeed, // index 2
      thirdERC20SubToken: ERC20SubTokenMagic, // index 3
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

describe("Gems:ERC20Group", function () {
  for (const test of erc20GroupTests) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    recurse(test);
  }
});
