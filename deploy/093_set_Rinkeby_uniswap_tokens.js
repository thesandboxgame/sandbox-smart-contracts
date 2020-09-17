const {guard} = require("../lib");
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
  const {execute, log} = deployments;
  const {deployer} = await getNamedAccounts();

  // Transfer some SAND tokens from deployer to the pair contract to be able to mint UniV2 tokens
  log("Transferring SAND to pair contract");
  await execute(
    "Sand",
    {from: deployer, skipUnknownSigner: true},
    "transfer",
    "0x57459003f480188204085A0F744ffEbcD53bcc5E",
    "100000000000000000000"
  );

  // WETH
  const wethContract = new Contract(
    "0xc778417E063141139Fce010982780140Aa0cD5Ab",
    wethABI,
    ethers.provider.getSigner(deployer)
  );

  const balance = await wethContract.functions.balanceOf(deployer);
  log(`Initial balance: ${balance}`);

  // log("Depositing ETH in WETH contract");
  // await wethContract.functions.deposit({value: "2000000000000000000", gasLimit: 1000000}).then((tx) => tx.wait());

  log("Transferring deployer's WETH to pair contract");
  await wethContract.functions
    .transferFrom(
      "0xc778417E063141139Fce010982780140Aa0cD5Ab",
      "0x57459003f480188204085A0F744ffEbcD53bcc5E",
      "2000000000000000000",
      {
        gasLimit: 10000000,
      }
    )
    .then((tx) => tx.wait());

  const pairContract = new Contract(
    "0x57459003f480188204085A0F744ffEbcD53bcc5E",
    IUniswapV2Pair.abi,
    ethers.provider.getSigner(deployer)
  );

  // Mint UniV2 tokens and give to deployer
  log("Minting UniswapV2 tokens and sending to deployer");
  await pairContract.mint(deployer, {gasLimit: 30000000});

  log("Minting completed; use wallet to transfer UniV2 tokens to reward pool contract address");
};
module.exports.dependencies = ["RinkebySANDRewardPool", "Sand"];
// module.exports.skip = guard(["1", "314159", "4"]);
