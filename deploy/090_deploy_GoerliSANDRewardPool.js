// const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
// const {Contract} = require("ethers");
// const {ethers} = require("@nomiclabs/buidler");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const chainId = await getChainId();

  if (chainId === "5") {
    let pair;

    // Uncomment to deploy a new UniswapV2 Pair Contract
    // -------------------------------
    // createPair to generate Goerli Uniswap SAND-ETH pair
    // // UniswapV2Factory is deployed at 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f on Mainnet, Rinkeby, Goerli
    // // const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    // // Goerli SAND token address, Goerli WETH token address
    // const token0AddressGoerli = "0x200814fe1B8F947084D810C099176685496e5d14";
    // const token1AddressGoerli = "0x0Bb7509324cE409F7bbC4b701f932eAca9736AB7";

    // const uniswapV2Factory = new Contract(
    //   uniswapV2FactoryAddress,
    //   IUniswapV2Factory.abi,
    //   ethers.provider.getSigner(deployer)
    // );

    // const pairCreatorAsDeployer = uniswapV2Factory.connect(ethers.provider.getSigner(deployer));

    // // check if the pair already exists (note: tokens can be in any order)
    // if (chainId === "5") {
    //   ({pair} = await pairCreatorAsDeployer.functions.getPair(token0AddressGoerli, token1AddressGoerli));
    //   let receipt;
    //   if (pair === "0x0000000000000000000000000000000000000000") {
    //     // createPair if the pair does not exist in the UniswapV2Factory
    //     receipt = await pairCreatorAsDeployer.functions
    //       .createPair(token0AddressGoerli, token1AddressGoerli, {
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
    const pairGoerli = "0x5FE20F3780551943a5F4A8bC739B2050942b4f92"; // Goerli

    if (pair !== "0x0000000000000000000000000000000000000000") {
      if (chainId === "5") {
        log("Goerli SAND address: 0x200814fe1B8F947084D810C099176685496e5d14");
        log("Goerli WETH address: 0x0Bb7509324cE409F7bbC4b701f932eAca9736AB7");
        log(`Goerli UniswapV2 SAND-ETH Pair Contract Address: ${pairGoerli}`); // 0x5FE20F3780551943a5F4A8bC739B2050942b4f92

        await deploy("GoerliSANDRewardPool", {
          from: deployer,
          args: [pairGoerli],
          log: true,
        });
      }
    }
  }
};
module.exports.skip = async () => true;
module.exports.tags = ["GoerliSANDRewardPool"];
