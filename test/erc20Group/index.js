const {assert, expect} = require("local-chai");
const ethers = require("ethers");
const {expectRevert, zeroAddress, waitFor, findEvents} = require("local-utils");
const {getContractAddress} = require("ethers/lib/utils");
const {Contract, ContractFactory, BigNumber} = ethers;
const {Web3Provider} = ethers.providers;

const erc20GroupABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "metaTransactionContract",
        type: "address",
      },
      {
        internalType: "address",
        name: "admin",
        type: "address",
      },
      {
        internalType: "address",
        name: "initialMinter",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "oldAdmin",
        type: "address",
      },
      {
        indexed: false,
        internalType: "address",
        name: "newAdmin",
        type: "address",
      },
    ],
    name: "AdminChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "ApprovalForAll",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "metaTransactionProcessor",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
    ],
    name: "MetaTransactionProcessor",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "minter",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
    ],
    name: "Minter",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "contract ERC20SubToken",
        name: "subToken",
        type: "address",
      },
    ],
    name: "SubToken",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "superOperator",
        type: "address",
      },
      {
        indexed: false,
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
    ],
    name: "SuperOperator",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "balance",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "owners",
        type: "address[]",
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
    ],
    name: "balanceOfBatch",
    outputs: [
      {
        internalType: "uint256[]",
        name: "balances",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    name: "batchBurnFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "amounts",
        type: "uint256[]",
      },
    ],
    name: "batchMint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256[]",
        name: "ids",
        type: "uint256[]",
      },
      {
        internalType: "uint256[]",
        name: "values",
        type: "uint256[]",
      },
    ],
    name: "batchTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "burnFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "newAdmin",
        type: "address",
      },
    ],
    name: "changeAdmin",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAdmin",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
    ],
    name: "isApprovedForAll",
    outputs: [
      {
        internalType: "bool",
        name: "isOperator",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "isAuthorizedToApprove",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
    ],
    name: "isAuthorizedToTransfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "who",
        type: "address",
      },
    ],
    name: "isMetaTransactionProcessor",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "who",
        type: "address",
      },
    ],
    name: "isMinter",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "who",
        type: "address",
      },
    ],
    name: "isSuperOperator",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "setApprovalForAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "sender",
        type: "address",
      },
      {
        internalType: "address",
        name: "operator",
        type: "address",
      },
      {
        internalType: "bool",
        name: "approved",
        type: "bool",
      },
    ],
    name: "setApprovalForAllFor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "metaTransactionProcessor",
        type: "address",
      },
      {
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
    ],
    name: "setMetaTransactionProcessor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "minter",
        type: "address",
      },
      {
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
    ],
    name: "setMinter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "superOperator",
        type: "address",
      },
      {
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
    ],
    name: "setSuperOperator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
    ],
    name: "singleTransferFrom",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
    ],
    name: "supplyOf",
    outputs: [
      {
        internalType: "uint256",
        name: "supply",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const receiver = {
  contractName: "ERC20Receiver",
  abi: [
    {
      inputs: [
        {
          internalType: "address",
          name: "_from",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_value",
          type: "uint256",
        },
        {
          internalType: "address",
          name: "_tokenAddress",
          type: "address",
        },
        {
          internalType: "bytes",
          name: "_data",
          type: "bytes",
        },
      ],
      name: "receiveApproval",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
  bytecode: "0x",
  deployedBytecode: "0x",
  linkReferences: {},
  deployedLinkReferences: {},
};

// const nonReceiving = {}; TODO

module.exports = (init, extensions) => {
  const tests = [];

  function preTest(test) {
    return async function () {
      const {
        ethereum,
        contractAddress,
        users,
        mint,
        batchMint,
        deployer,
        ERC20SubToken,
        secondERC20SubToken,
        thirdERC20SubToken,
      } = await init();
      const ethersProvider = new Web3Provider(ethereum);

      const receiverFactory = new ContractFactory(receiver.abi, receiver.bytecode, ethersProvider.getSigner(deployer));

      // const nonReceivingFactory = new ContractFactory(
      //   nonReceiving.abi,
      //   nonReceiving.bytecode,
      //   ethersProvider.getSigner(deployer)
      // );

      // function deployNonReceivingContract(...args) {
      //   return nonReceivingFactory.deploy(...args);
      // }

      function deployERC20TokenReceiver(...args) {
        return receiverFactory.deploy(...args);
      }

      const contract = new Contract(contractAddress, erc20GroupABI, ethersProvider);

      const usersWithContracts = [];
      for (const user of users) {
        usersWithContracts.push({
          address: user,
          contract: contract.connect(ethersProvider.getSigner(user)),
          initialBalance: BigNumber.from(0),
        });
      }

      return test({
        contract,
        mint,
        batchMint,
        users: usersWithContracts,
        ethersProvider,
        // deployNonReceivingContract,
        deployERC20TokenReceiver,
        ERC20SubToken,
        secondERC20SubToken,
        thirdERC20SubToken,
      });
    };
  }

  function describe(title, func) {
    const subTests = [];
    func((title, test) => {
      subTests.push({title, test: preTest(test)});
    });
    tests.push({title, subTests});
  }

  function it(title, test) {
    tests.push({title, test: preTest(test)});
  }

  describe("mint", function (it) {
    it("minting one token results in correct balance update", async function ({contract, mint, users}) {
      const initialBalance = await contract.balanceOf(users[1].address, 1);
      assert.ok(initialBalance, BigNumber.from(0));
      await mint(users[1].address, 1);
      const newBalance = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalance, BigNumber.from(1));
    });

    it("minting one token results in a Transfer event", async function ({mint, users, ERC20SubToken}) {
      const receipt = await mint(users[1].address, 1);
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], zeroAddress);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2], BigNumber.from(1));
    });

    it("minting several tokens results in correct balance update", async function ({contract, mint, users}) {
      const initialBalance = await contract.balanceOf(users[1].address, 1);
      assert.ok(initialBalance, BigNumber.from(0));
      await mint(users[1].address, 5);
      const newBalance = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalance, BigNumber.from(5));
    });

    it("minting several tokens results in a Transfer event", async function ({mint, users, ERC20SubToken}) {
      const receipt = await mint(users[1].address, 5);
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], zeroAddress);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2], BigNumber.from(5));
    });
  });

  describe("batchMint", function (it) {
    it("minting multiple token types results in correct balance updates", async function ({
      contract,
      batchMint,
      users,
    }) {
      const initialBalances = [];
      initialBalances.push(await contract.balanceOf(users[1].address, 1));
      initialBalances.push(await contract.balanceOf(users[1].address, 2));
      initialBalances.push(await contract.balanceOf(users[1].address, 3));
      assert.equal(initialBalances[0], 0);
      assert.equal(initialBalances[1], 0);
      assert.equal(initialBalances[2], 0);
      await batchMint(users[1].address, [5, 6, 7]);
      const newBalances = [];
      newBalances.push(await contract.balanceOf(users[1].address, 1));
      newBalances.push(await contract.balanceOf(users[1].address, 2));
      newBalances.push(await contract.balanceOf(users[1].address, 3));
      assert.ok(newBalances[0], BigNumber.from(5));
      assert.ok(newBalances[1], BigNumber.from(6));
      assert.ok(newBalances[2], BigNumber.from(7));
    });

    it("batchMint results in a Transfer event for each sub-token", async function ({
      batchMint,
      users,
      ERC20SubToken,
      secondERC20SubToken,
      thirdERC20SubToken,
    }) {
      const receipt = await batchMint(users[1].address, [5, 6, 7]);
      const eventsMatchingFirstSubToken = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingFirstSubToken.length, 1);
      const firstEvent = eventsMatchingFirstSubToken[0];
      assert.equal(firstEvent.args[0], zeroAddress);
      assert.equal(firstEvent.args[1], users[1].address);
      assert.ok(firstEvent.args[2], BigNumber.from(5));
      const eventsMatchingSecondSubToken = await findEvents(secondERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingSecondSubToken.length, 1);
      const secondEvent = eventsMatchingSecondSubToken[0];
      assert.equal(secondEvent.args[0], zeroAddress);
      assert.equal(secondEvent.args[1], users[1].address);
      assert.ok(secondEvent.args[2], BigNumber.from(6));
      const eventsMatchingThirdSubToken = await findEvents(thirdERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingThirdSubToken.length, 1);
      const thirdEvent = eventsMatchingThirdSubToken[0];
      assert.equal(thirdEvent.args[0], zeroAddress);
      assert.equal(thirdEvent.args[1], users[1].address);
      assert.ok(thirdEvent.args[2], BigNumber.from(7));
    });

    it("balanceOfBatch returns the correct balances", async function ({contract, batchMint, users}) {
      const initialBalances = [];
      initialBalances.push(await contract.balanceOf(users[1].address, 1));
      initialBalances.push(await contract.balanceOf(users[1].address, 2));
      initialBalances.push(await contract.balanceOf(users[1].address, 3));
      assert.equal(initialBalances[0], 0);
      assert.equal(initialBalances[1], 0);
      assert.equal(initialBalances[2], 0);
      await batchMint(users[1].address, [5, 6, 7]);
      const newBalances = await contract.balanceOfBatch(
        [users[1].address, users[1].address, users[1].address],
        [1, 2, 3]
      );
      assert.ok(newBalances[0], BigNumber.from(5));
      assert.ok(newBalances[1], BigNumber.from(6));
      assert.ok(newBalances[2], BigNumber.from(7));
    });
  });

  describe("transfer", function (it) {
    it("transferring one instance of an item using singleTransferFrom results in a transfer event", async function ({
      mint,
      contract,
      users,
      ERC20SubToken,
    }) {
      await mint(users[0].address, 100);
      const initialBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      assert.ok(initialBalanceUser0, BigNumber.from(100));
      const initialBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.equal(initialBalanceUser1, 0);
      const receipt = await users[0].contract
        .singleTransferFrom(users[0].address, users[1].address, 1, 1)
        .then((tx) => tx.wait());
      const newBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      const newBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalanceUser0, BigNumber.from(99));
      assert.ok(newBalanceUser1, BigNumber.from(1));
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], users[0].address);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2], BigNumber.from(1));
    });

    it("transferring several instances of an item using singleTransferFrom results in a transfer event", async function ({
      contract,
      mint,
      users,
      ERC20SubToken,
    }) {
      await mint(users[0].address, 8);
      const initialBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      assert.ok(initialBalanceUser0, BigNumber.from(8));
      const initialBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.equal(initialBalanceUser1, 0);
      const receipt = await users[0].contract
        .singleTransferFrom(users[0].address, users[1].address, 1, 8)
        .then((tx) => tx.wait());
      const newBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      const newBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalanceUser0, BigNumber.from(0));
      assert.ok(newBalanceUser1, BigNumber.from(8));
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], users[0].address);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2], BigNumber.from(8));
    });

    it("transferring 0 instances of an item using singleTransferFrom results in a transfer event", async function ({
      contract,
      mint,
      users,
      ERC20SubToken,
    }) {
      await mint(users[0].address, 8);
      const initialBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      assert.ok(initialBalanceUser0, BigNumber.from(8));
      const initialBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.equal(initialBalanceUser1, 0);
      const receipt = await users[0].contract
        .singleTransferFrom(users[0].address, users[1].address, 1, 0)
        .then((tx) => tx.wait());
      const newBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      const newBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalanceUser0, BigNumber.from(0));
      assert.ok(newBalanceUser1, BigNumber.from(8));
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], users[0].address);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2], BigNumber.from(0));
    });

    it("transferring one instance of several items using batchTransferFrom results in several transfer events", async function ({
      batchMint,
      users,
      ERC20SubToken,
      secondERC20SubToken,
      thirdERC20SubToken,
    }) {
      await batchMint(users[1].address, [5, 6, 7]);
      const receipt = await users[1].contract
        .batchTransferFrom(users[1].address, users[2].address, [1, 2, 3], [5, 6, 7])
        .then((tx) => tx.wait());

      const eventsMatchingFirstSubToken = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingFirstSubToken.length, 1);
      const firstEvent = eventsMatchingFirstSubToken[0];
      assert.equal(firstEvent.args[0], users[1].address);
      assert.equal(firstEvent.args[1], users[2].address);
      assert.ok(firstEvent.args[2], BigNumber.from(5));
      const eventsMatchingSecondSubToken = await findEvents(secondERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingSecondSubToken.length, 1);
      const secondEvent = eventsMatchingSecondSubToken[0];
      assert.equal(secondEvent.args[0], users[1].address);
      assert.equal(secondEvent.args[1], users[2].address);
      assert.ok(secondEvent.args[2], BigNumber.from(6));
      const eventsMatchingThirdSubToken = await findEvents(thirdERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingThirdSubToken.length, 1);
      const thirdEvent = eventsMatchingThirdSubToken[0];
      assert.equal(thirdEvent.args[0], users[1].address);
      assert.equal(thirdEvent.args[1], users[2].address);
      assert.ok(thirdEvent.args[2], BigNumber.from(7));
    });

    it("transferring 0 instances of several items using batchTransferFrom results in several transfer events", async function ({
      batchMint,
      users,
      ERC20SubToken,
      secondERC20SubToken,
      thirdERC20SubToken,
    }) {
      await batchMint(users[1].address, [5, 6, 7]);
      const receipt = await users[1].contract
        .batchTransferFrom(users[1].address, users[2].address, [1, 2, 3], [0, 0, 0])
        .then((tx) => tx.wait());

      const eventsMatchingFirstSubToken = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingFirstSubToken.length, 1);
      const firstEvent = eventsMatchingFirstSubToken[0];
      assert.equal(firstEvent.args[0], users[1].address);
      assert.equal(firstEvent.args[1], users[2].address);
      assert.ok(firstEvent.args[2], BigNumber.from(0));
      const eventsMatchingSecondSubToken = await findEvents(secondERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingSecondSubToken.length, 1);
      const secondEvent = eventsMatchingSecondSubToken[0];
      assert.equal(secondEvent.args[0], users[1].address);
      assert.equal(secondEvent.args[1], users[2].address);
      assert.ok(secondEvent.args[2], BigNumber.from(0));
      const eventsMatchingThirdSubToken = await findEvents(thirdERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingThirdSubToken.length, 1);
      const thirdEvent = eventsMatchingThirdSubToken[0];
      assert.equal(thirdEvent.args[0], users[1].address);
      assert.equal(thirdEvent.args[1], users[2].address);
      assert.ok(thirdEvent.args[2], BigNumber.from(0));
    });

    // TODO deploy args

    // it("transferring to a contract with singleTransferFrom that does accept ERC20 token should not fail", async function ({}) {});

    // it("transferring to a contract with batchTransferFrom that does accept ERC20 token should not fail", async function ({}) {});

    // it("transferring to a contract with singleTransferFrom that does not accept ERC20 token should fail", async function ({}) {});

    // it("transferring to a contract with batchTransferFrom that does not accept ERC20 token should fail", async function ({}) {});
  });

  describe("burn", function (it) {
    it("burnFrom", async function ({contract, mint, users}) {});
    it("batchBurnFrom", async function ({contract, mint, users}) {});
  });

  describe("approvals", function (it) {
    it("setApprovalForAllFor", async function ({contract, mint, users}) {});
    it("setApprovalForAll", async function ({contract, mint, users}) {});
    it("isApprovedForAll", async function ({contract, mint, users}) {});
    it("isAuthorizedToTransfer", async function ({contract, mint, users}) {});
    it("isAuthorizedToApprove", async function ({contract, mint, users}) {});
  });

  describe("interface", function (it) {});

  return tests;
};
