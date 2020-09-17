const {Contract, utils} = require("ethers");
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

  // Give WETH to deployer and transfer to Uniswap pool
  const wethContract = new Contract(
    "0x0Bb7509324cE409F7bbC4b701f932eAca9736AB7",
    wethABI,
    ethers.provider.getSigner(deployer)
  );

  log("Depositing ETH in WETH contract");
  await wethContract.functions.deposit({value: utils.parseEther("2.0"), gasLimit: 1000000}).then((tx) => tx.wait());

  log("Transfer WETH from WETH contract to pair");
  await wethContract.functions
    .transferFrom(
      "0x0Bb7509324cE409F7bbC4b701f932eAca9736AB7",
      "0x5FE20F3780551943a5F4A8bC739B2050942b4f92",
      "1000000000000000000",
      {
        gasLimit: 1000000,
      }
    )
    .then((tx) => tx.wait());

  // Transfer WETH and SAND tokens to the pair contract to be able to mint UniV2 tokens
  log("Transfer SAND from deployer to pair");
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
};
module.exports.dependencies = ["RinkebySANDRewardPool", "Sand"];
module.exports.skip = async () => true;
