const {guard} = require("../lib");
// const IUniswapV2Factory = require("@uniswap/v2-core/build/IUniswapV2Factory.json");
const {Contract} = require("ethers");
const {ethers} = require("@nomiclabs/buidler");
const IUniswapV2Pair = require("@uniswap/v2-core/build/IUniswapV2Pair.json");
const wethABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{name: "", type: "string"}],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {name: "guy", type: "address"},
      {name: "wad", type: "uint256"},
    ],
    name: "approve",
    outputs: [{name: "", type: "bool"}],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [{name: "", type: "uint256"}],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {name: "src", type: "address"},
      {name: "dst", type: "address"},
      {name: "wad", type: "uint256"},
    ],
    name: "transferFrom",
    outputs: [{name: "", type: "bool"}],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{name: "wad", type: "uint256"}],
    name: "withdraw",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{name: "", type: "uint8"}],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{name: "", type: "address"}],
    name: "balanceOf",
    outputs: [{name: "", type: "uint256"}],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{name: "", type: "string"}],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      {name: "dst", type: "address"},
      {name: "wad", type: "uint256"},
    ],
    name: "transfer",
    outputs: [{name: "", type: "bool"}],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [],
    name: "deposit",
    outputs: [],
    payable: true,
    stateMutability: "payable",
    type: "function",
  },
  {
    constant: true,
    inputs: [
      {name: "", type: "address"},
      {name: "", type: "address"},
    ],
    name: "allowance",
    outputs: [{name: "", type: "uint256"}],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {payable: true, stateMutability: "payable", type: "fallback"},
  {
    anonymous: false,
    inputs: [
      {indexed: true, name: "src", type: "address"},
      {indexed: true, name: "guy", type: "address"},
      {indexed: false, name: "wad", type: "uint256"},
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {indexed: true, name: "src", type: "address"},
      {indexed: true, name: "dst", type: "address"},
      {indexed: false, name: "wad", type: "uint256"},
    ],
    name: "Transfer",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {indexed: true, name: "dst", type: "address"},
      {indexed: false, name: "wad", type: "uint256"},
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {indexed: true, name: "src", type: "address"},
      {indexed: false, name: "wad", type: "uint256"},
    ],
    name: "Withdrawal",
    type: "event",
  },
];

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const chainId = await getChainId();

  if (chainId === "4" || chainId === "5") {
    let pair;

    // Uncomment to deploy a new UniswapV2 Pair Contract
    // -------------------------------
    // createPair to generate Rinkeby / Goerli Uniswap SAND-ETH pair
    // // UniswapV2Factory is deployed at 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f on Mainnet, Rinkeby, Goerli
    // // const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    // // Rinkeby SAND token address, Rinkeby WETH token address
    // const token0AddressRinkeby = "0xCc933a862fc15379E441F2A16Cb943D385a4695f";
    // const token1AddressRinkeby = "0xc778417E063141139Fce010982780140Aa0cD5Ab";

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

    // If pair contract address is known, update below
    const pairRinkeby = "0x57459003f480188204085A0F744ffEbcD53bcc5E"; // Rinkeby
    const pairGoerli = "0x5FE20F3780551943a5F4A8bC739B2050942b4f92"; // Goerli

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
      if (chainId === "5") {
        log("Goerli SAND address: 0x200814fe1B8F947084D810C099176685496e5d14");
        log("Goerli WETH address: 0x0Bb7509324cE409F7bbC4b701f932eAca9736AB7");
        log(`Goerli UniswapV2 SAND-ETH Pair Contract Address: ${pairGoerli}`); // 0x5FE20F3780551943a5F4A8bC739B2050942b4f92

        await deploy("GoerliSANDRewardPool", {
          from: deployer,
          args: [pairGoerli],
          log: true,
        });

        // Give WETH to deployer and transfer to Uniswap pool
        const wethContract = new Contract(
          "0x0Bb7509324cE409F7bbC4b701f932eAca9736AB7",
          wethABI,
          ethers.provider.getSigner(deployer)
        );

        log("Depositing ETH in WETH contract");
        await wethContract.functions.deposit({value: "5000000000000000000", gasLimit: 1000000}).then((tx) => tx.wait());

        log("Transfer WETH from WETH contract to deployer");
        await wethContract.functions
          .transferFrom("0x0Bb7509324cE409F7bbC4b701f932eAca9736AB7", deployer, "4000000000000000000", {
            gasLimit: 1000000,
          })
          .then((tx) => tx.wait());

        // log("Withdrawing ETH from WETH contract");
        // await wethContract.functions.withdraw("4000000000000000000", {gasLimit: 1000000}).then((tx) => tx.wait());

        // Transfer WETH and SAND tokens to the pair contract to be able to mint UniV2 tokens
        await execute(
          "Sand",
          {from: deployer, skipUnknownSigner: true},
          "transfer",
          "0x5FE20F3780551943a5F4A8bC739B2050942b4f92",
          "100000000000000000000"
        );

        const pairContract = new Contract(
          "0x5FE20F3780551943a5F4A8bC739B2050942b4f92",
          IUniswapV2Pair.abi,
          ethers.provider.getSigner(deployer)
        );

        // Mint UniV2 tokens and give to deployer
        log("Minting UniswapV2 tokens and sending to deployer");
        await pairContract.mint(deployer, {gasLimit: 1000000});

        log("Minting completed; use wallet to transfer UniV2 tokens to reward pool contract address");
      }
    }
  }
};

module.exports.skip = guard(["1", "314159", "4", "5"], "GoerliSANDRewardPool"); // TODO Update for Rinkeby
module.exports.tags = ["GoerliSANDRewardPool"]; // TODO Update for Rinkeby
