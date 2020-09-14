const {guard} = require("../lib");
const ethers = require("ethers");
const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy} = deployments;
  const {deployer} = await getNamedAccounts();

  // add createPair code to generate Rinkeby Uniswap SAND-ETH pair
  // UniswapV2Factory is deployed at 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f on Mainnet and Rinkeby
  const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
  const uniswapV2Factory = new ethers.Contract(uniswapV2FactoryAddress, IUniswapV2Factory);

  const receipt = await uniswapV2Factory
    .connect(deployer)
    .functions.createPair("0xCc933a862fc15379E441F2A16Cb943D385a4695f", "0xc778417e063141139fce010982780140aa0cd5ab") // Rinkeby SAND token address, Rinkeby WETH token address
    .then((tx) => tx.wait());

  // event PairCreated(address indexed token0, address indexed token1, address pair, uint);
  const pairCreatedEvent = receipt.events.find((event) => event.event === "PairCreated");

  if (pairCreatedEvent) {
    const pairContractAddress = pairCreatedEvent.args[2];

    await deploy("TestSANDRewardPool", {
      from: deployer,
      args: [pairContractAddress],
      log: true,
    });
  }
};
module.exports.skip = guard(["1", "314159", "4"]); // TODO "TestSANDRewardPool"
module.exports.tags = ["TestSANDRewardPool"];
