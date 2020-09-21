// const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
// const {Contract} = require("ethers");
// const {ethers} = require("@nomiclabs/buidler");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const chainId = await getChainId();

  if (chainId === "4") {
    let pair;

    // Uncomment to deploy a new UniswapV2 Pair Contract
    // -------------------------------
    // createPair to generate Rinkeby Uniswap SAND-ETH pair
    // // UniswapV2Factory is deployed at 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f on Mainnet, Rinkeby, Goerli
    // // const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    // // Rinkeby SAND token address, Rinkeby WETH token address
    // const token0AddressRinkeby = "0xCc933a862fc15379E441F2A16Cb943D385a4695f";
    // const token1AddressRinkeby = "0xc778417E063141139Fce010982780140Aa0cD5Ab";

    // const uniswapV2Factory = new Contract(
    //   uniswapV2FactoryAddress,
    //   IUniswapV2Factory.abi,
    //   ethers.provider.getSigner(deployer)
    // );

    // const pairCreatorAsDeployer = uniswapV2Factory.connect(ethers.provider.getSigner(deployer));

    // // check if the pair already exists (note: tokens can be in any order)
    // if (chainId === "4") {
    //   ({pair} = await pairCreatorAsDeployer.functions.getPair(token0AddressRinkeby, token1AddressRinkeby));
    //   let receipt;
    //   if (pair === "0x0000000000000000000000000000000000000000") {
    //     // createPair if the pair does not exist in the UniswapV2Factory
    //     receipt = await pairCreatorAsDeployer.functions
    //       .createPair(token0AddressRinkeby, token1AddressRinkeby, {
    //         gasLimit: 8000000,
    //       })
    //       .then((tx) => tx.wait());
    //   }

    //   const events = receipt.events;
    //   const pairCreationEvent = events.find((event) => event.event === "PairCreated");
    //   pair = pairCreationEvent.args[2];
    // }
    // -------------------------------

    // If pair does not exist, comment below pairs out and update below section
    const pairRinkeby = "0x57459003f480188204085A0F744ffEbcD53bcc5E"; // Rinkeby

    if (pair !== "0x0000000000000000000000000000000000000000") {
      if (chainId === "4") {
        log("Rinkeby SAND address: 0xCc933a862fc15379E441F2A16Cb943D385a4695f");
        log("Rinkeby WETH address: 0xc778417E063141139Fce010982780140Aa0cD5Ab");
        log(`Rinkeby UniswapV2 SAND-ETH Pair Contract Address: ${pairRinkeby}`); // 0x57459003f480188204085A0F744ffEbcD53bcc5E

        await deploy("RinkebySANDRewardPool", {
          from: deployer,
          args: [pairRinkeby],
          log: true,
        });
      }
    }
  }
};
