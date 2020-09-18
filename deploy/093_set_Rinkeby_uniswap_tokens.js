const {guard} = require("../lib");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {read, execute, log} = deployments;
  const {deployer, sandBeneficiary} = await getNamedAccounts();

  await deployments.get("Sand");
  await deployments.get("WrappedEther");
  const sandEthUniswapV2Pair = await deployments.get("SandEthIUniswapV2Pair");

  // Transfer some SAND tokens and WETH to the pair contract to be able to mint Rinkeby UniV2 tokens

  log("Transferring SAND to pair contract");
  await execute(
    "Sand",
    {from: sandBeneficiary, skipUnknownSigner: true, gasLimit: 6000000},
    "transfer",
    sandEthUniswapV2Pair.address,
    "30000000000000000000000"
  );

  const balanceSandInPair = await read("Sand", "balanceOf", sandEthUniswapV2Pair.address);
  log(`SAND balance in pair: ${balanceSandInPair}`);

  log("Depositing ETH in WETH contract");
  await execute(
    "WrappedEther",
    {from: deployer, skipUnknownSigner: true, value: "4000000000000000000", gasLimit: 6000000},
    "deposit"
  );

  const balanceWeth = await read("WrappedEther", "balanceOf", deployer);
  log(`WETH balance: ${balanceWeth}`);

  log("Transferring deployer's WETH to pair contract");
  await execute(
    "WrappedEther",
    {from: deployer, skipUnknownSigner: true, gasLimit: 6000000},
    "transferFrom",
    deployer,
    sandEthUniswapV2Pair.address,
    balanceWeth
  );

  const balanceWethInPair = await read("WrappedEther", "balanceOf", sandEthUniswapV2Pair.address);
  log(`WETH in pair contract: ${balanceWethInPair}`);

  log("Minting UniswapV2 tokens and sending to deployer");
  await execute(
    "SandEthIUniswapV2Pair",
    {from: deployer, skipUnknownSigner: true, gasLimit: 6000000},
    "mint",
    deployer
  );

  const balanceUniV2Tokens = await read("SandEthIUniswapV2Pair", "balanceOf", deployer);
  log(`Deployer's UniV2 balance: ${balanceUniV2Tokens}`);

  // log("Transferring UniV2 tokens to reward pool contract address");
  // const rewardPool = await deployments.get("RinkebySANDRewardPool");

  // await execute(
  //   "SandEthIUniswapV2Pair",
  //   {from: deployer, skipUnknownSigner: true, gasLimit: 6000000},
  //   "transferFrom",
  //   deployer,
  //   rewardPool.address,
  //   balanceUniV2Tokens
  // );

  // const balanceUniV2TokensInPool = await read("SandEthIUniswapV2Pair", "balanceOf", rewardPool.address);
  // log(`Staked UniV2 balance: ${balanceUniV2TokensInPool}`);
};
module.exports.dependencies = ["RinkebySANDRewardPool", "Sand", "WrappedEther", "SandEthIUniswapV2Pair"];
module.exports.skip = guard(["1", "314159", "4"]);
