const {assert, expect} = require("local-chai");
const ethers = require("ethers");
const {expectRevert, zeroAddress} = require("local-utils");
const {findEvents} = require("../../lib/findEvents.js");
const {Contract, BigNumber} = ethers;
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

module.exports = (init, extensions) => {
  const tests = [];

  function preTest(test) {
    return async function () {
      const {
        ethereum,
        contractAddress,
        users,
        mint,
        minterContract,
        batchMint,
        minter,
        meta,
        tokenByIds,
        ERC20SubToken,
        secondERC20SubToken,
        thirdERC20SubToken,
        sandContract,
      } = await init();

      const ethersProvider = new Web3Provider(ethereum);

      const contract = new Contract(contractAddress, erc20GroupABI, ethersProvider);

      const contractAsMinter = contract.connect(ethersProvider.getSigner(minter));

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
        contractAsMinter,
        minterContract,
        meta,
        users: usersWithContracts,
        ethersProvider,
        ERC20SubToken,
        secondERC20SubToken,
        thirdERC20SubToken,
        tokenByIds,
        sandContract,
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
      assert.ok(initialBalance.eq(BigNumber.from(0)));
      await mint(users[1].address, 1);
      const newBalance = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalance.eq(BigNumber.from(1)));
    });

    it("minting one token results in a Transfer event", async function ({mint, users, ERC20SubToken}) {
      const receipt = await mint(users[1].address, 1);
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], zeroAddress);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2].eq(BigNumber.from(1)));
    });

    it("minting several tokens results in correct balance update", async function ({contract, mint, users}) {
      const initialBalance = await contract.balanceOf(users[1].address, 1);
      assert.ok(initialBalance.eq(BigNumber.from(0)));
      await mint(users[1].address, 5);
      const newBalance = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalance.eq(BigNumber.from(5)));
    });

    it("minting several tokens results in a Transfer event", async function ({mint, users, ERC20SubToken}) {
      const receipt = await mint(users[1].address, 5);
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], zeroAddress);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2].eq(BigNumber.from(5)));
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
      assert.ok(newBalances[0].eq(BigNumber.from(5)));
      assert.ok(newBalances[1].eq(BigNumber.from(6)));
      assert.ok(newBalances[2].eq(BigNumber.from(7)));
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
      assert.ok(firstEvent.args[2].eq(BigNumber.from(5)));
      const eventsMatchingSecondSubToken = await findEvents(secondERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingSecondSubToken.length, 1);
      const secondEvent = eventsMatchingSecondSubToken[0];
      assert.equal(secondEvent.args[0], zeroAddress);
      assert.equal(secondEvent.args[1], users[1].address);
      assert.ok(secondEvent.args[2].eq(BigNumber.from(6)));
      const eventsMatchingThirdSubToken = await findEvents(thirdERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingThirdSubToken.length, 1);
      const thirdEvent = eventsMatchingThirdSubToken[0];
      assert.equal(thirdEvent.args[0], zeroAddress);
      assert.equal(thirdEvent.args[1], users[1].address);
      assert.ok(thirdEvent.args[2].eq(BigNumber.from(7)));
    });

    it("balanceOfBatch returns the correct balances", async function ({contract, batchMint, users}) {
      const initialBalances = [];
      initialBalances.push(await contract.balanceOf(users[1].address, 1));
      initialBalances.push(await contract.balanceOf(users[1].address, 2));
      initialBalances.push(await contract.balanceOf(users[1].address, 3));
      assert.ok(initialBalances[0].eq(BigNumber.from(0)));
      assert.ok(initialBalances[1].eq(BigNumber.from(0)));
      assert.ok(initialBalances[2].eq(BigNumber.from(0)));
      await batchMint(users[1].address, [5, 6, 7]);
      const newBalances = await contract.balanceOfBatch(
        [users[1].address, users[1].address, users[1].address],
        [1, 2, 3]
      );
      assert.ok(newBalances[0].eq(BigNumber.from(5)));
      assert.ok(newBalances[1].eq(BigNumber.from(6)));
      assert.ok(newBalances[2].eq(BigNumber.from(7)));
    });

    it("balanceOfBatch reverts if array lengths for token IDs and token quantities are inconsistent", async function ({
      contract,
      batchMint,
      users,
    }) {
      await batchMint(users[1].address, [5, 6, 7]);
      await expectRevert(
        contract.balanceOfBatch([users[1].address, users[1].address], [1, 2, 3]),
        "INVALID_INCONSISTENT_LENGTH"
      );
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
      assert.ok(initialBalanceUser0.eq(BigNumber.from(100)));
      const initialBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.equal(initialBalanceUser1, 0);
      const receipt = await users[0].contract
        .singleTransferFrom(users[0].address, users[1].address, 1, 1)
        .then((tx) => tx.wait());
      const newBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      const newBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalanceUser0.eq(BigNumber.from(99)));
      assert.ok(newBalanceUser1.eq(BigNumber.from(1)));
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], users[0].address);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2].eq(BigNumber.from(1)));
    });

    it("transferring several instances of an item using singleTransferFrom results in a transfer event", async function ({
      contract,
      mint,
      users,
      ERC20SubToken,
    }) {
      await mint(users[0].address, 8);
      const initialBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      assert.ok(initialBalanceUser0.eq(BigNumber.from(8)));
      const initialBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.equal(initialBalanceUser1, 0);
      const receipt = await users[0].contract
        .singleTransferFrom(users[0].address, users[1].address, 1, 8)
        .then((tx) => tx.wait());
      const newBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      const newBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalanceUser0.eq(BigNumber.from(0)));
      assert.ok(newBalanceUser1.eq(BigNumber.from(8)));
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], users[0].address);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2].eq(BigNumber.from(8)));
    });

    it("transferring 0 instances of an item using singleTransferFrom results in a transfer event", async function ({
      contract,
      mint,
      users,
      ERC20SubToken,
    }) {
      await mint(users[0].address, 8);
      const initialBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      assert.ok(initialBalanceUser0.eq(BigNumber.from(8)));
      const initialBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.equal(initialBalanceUser1, 0);
      const receipt = await users[0].contract
        .singleTransferFrom(users[0].address, users[1].address, 1, 0)
        .then((tx) => tx.wait());
      const newBalanceUser0 = await contract.balanceOf(users[0].address, 1);
      const newBalanceUser1 = await contract.balanceOf(users[1].address, 1);
      assert.ok(newBalanceUser0.eq(BigNumber.from(8)));
      assert.ok(newBalanceUser1.eq(BigNumber.from(0)));
      const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], users[0].address);
      assert.equal(transferEvent.args[1], users[1].address);
      assert.ok(transferEvent.args[2].eq(BigNumber.from(0)));
    });

    it("cannot transfer more than the supply using singleTransferFrom", async function ({contract, users}) {
      const initialBalanceUser0 = await contract.balanceOf(users[3].address, 1);
      assert.ok(initialBalanceUser0.eq(BigNumber.from(0)));

      await expectRevert(
        users[3].contract.singleTransferFrom(users[3].address, users[1].address, 1, 5),
        "can't substract more than there is"
      );
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
      assert.ok(firstEvent.args[2].eq(BigNumber.from(5)));
      const eventsMatchingSecondSubToken = await findEvents(secondERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingSecondSubToken.length, 1);
      const secondEvent = eventsMatchingSecondSubToken[0];
      assert.equal(secondEvent.args[0], users[1].address);
      assert.equal(secondEvent.args[1], users[2].address);
      assert.ok(secondEvent.args[2].eq(BigNumber.from(6)));
      const eventsMatchingThirdSubToken = await findEvents(thirdERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingThirdSubToken.length, 1);
      const thirdEvent = eventsMatchingThirdSubToken[0];
      assert.equal(thirdEvent.args[0], users[1].address);
      assert.equal(thirdEvent.args[1], users[2].address);
      assert.ok(thirdEvent.args[2].eq(BigNumber.from(7)));
    });

    it("transferring one instance of several items using batchTransferFrom including 0-id results in several transfer events", async function ({
      batchMint,
      users,
      tokenByIds,
    }) {
      await batchMint(users[1].address, [5, 6, 7], [0, 2, 3]);
      const receipt = await users[1].contract
        .batchTransferFrom(users[1].address, users[2].address, [0, 2, 3], [5, 6, 7])
        .then((tx) => tx.wait());

      // TODO
      const eventsMatchingFirstSubToken = await findEvents(tokenByIds[0], "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingFirstSubToken.length, 1);
      const firstEvent = eventsMatchingFirstSubToken[0];
      assert.equal(firstEvent.args[0], users[1].address);
      assert.equal(firstEvent.args[1], users[2].address);
      assert.ok(firstEvent.args[2].eq(BigNumber.from(5)));
      const eventsMatchingSecondSubToken = await findEvents(tokenByIds[2], "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingSecondSubToken.length, 1);
      const secondEvent = eventsMatchingSecondSubToken[0];
      assert.equal(secondEvent.args[0], users[1].address);
      assert.equal(secondEvent.args[1], users[2].address);
      assert.ok(secondEvent.args[2].eq(BigNumber.from(6)));
      const eventsMatchingThirdSubToken = await findEvents(tokenByIds[3], "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingThirdSubToken.length, 1);
      const thirdEvent = eventsMatchingThirdSubToken[0];
      assert.equal(thirdEvent.args[0], users[1].address);
      assert.equal(thirdEvent.args[1], users[2].address);
      assert.ok(thirdEvent.args[2].eq(BigNumber.from(7)));
    });

    it("transferring one instance of several items using batchTransferFrom including 0-id results in several correct balance update", async function ({
      batchMint,
      users,
      tokenByIds,
    }) {
      await batchMint(users[1].address, [5, 6, 7], [0, 2, 3]);
      const receipt = await users[1].contract
        .batchTransferFrom(users[1].address, users[2].address, [0, 2, 3], [5, 6, 7])
        .then((tx) => tx.wait());
      const balanceFor0 = await users[1].contract.balanceOf(users[2].address, 0);
      expect(balanceFor0).to.equal(5);
      const balanceFor1 = await users[1].contract.balanceOf(users[2].address, 2);
      expect(balanceFor1).to.equal(6);
      const balanceFor2 = await users[1].contract.balanceOf(users[2].address, 3);
      expect(balanceFor2).to.equal(7);
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
      assert.ok(firstEvent.args[2].eq(BigNumber.from(0)));
      const eventsMatchingSecondSubToken = await findEvents(secondERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingSecondSubToken.length, 1);
      const secondEvent = eventsMatchingSecondSubToken[0];
      assert.equal(secondEvent.args[0], users[1].address);
      assert.equal(secondEvent.args[1], users[2].address);
      assert.ok(secondEvent.args[2].eq(BigNumber.from(0)));
      const eventsMatchingThirdSubToken = await findEvents(thirdERC20SubToken, "Transfer", receipt.blockHash);
      assert.equal(eventsMatchingThirdSubToken.length, 1);
      const thirdEvent = eventsMatchingThirdSubToken[0];
      assert.equal(thirdEvent.args[0], users[1].address);
      assert.equal(thirdEvent.args[1], users[2].address);
      assert.ok(thirdEvent.args[2].eq(BigNumber.from(0)));
    });

    it("cannot transfer more than the supply using batchTransferFrom", async function ({users}) {
      await expectRevert(
        users[3].contract.batchTransferFrom(users[3].address, users[1].address, [1, 2, 3], [5, 6, 7]),
        "can't substract more than there is"
      );
    });

    it("cannot transfer more than the supply for one token using batchTransferFrom", async function ({users}) {
      await expectRevert(
        users[3].contract.batchTransferFrom(users[3].address, users[1].address, [1, 2, 3], [0, 5, 0]),
        "can't substract more than there is"
      );
    });
  });

  describe("approvals", function (it) {
    it("setApprovalForAllFor should grant the ability for an address to transfer token on behalf of another address", async function ({
      users,
      contract,
      mint,
    }) {
      const result = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(result, false);
      const receipt = await users[0].contract
        .setApprovalForAllFor(users[0].address, users[4].address, true)
        .then((tx) => tx.wait());
      assert.equal(receipt.events[0].event, "ApprovalForAll");
      assert.equal(receipt.events[0].args[0], users[0].address);
      assert.equal(receipt.events[0].args[1], users[4].address);
      assert.equal(receipt.events[0].args[2], true);
      const newResult = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(newResult, true);
      await mint(users[0].address, 8);
      await users[4].contract.singleTransferFrom(users[0].address, users[1].address, 1, 8);
      const user1Balance = await contract.balanceOf(users[1].address, 1);
      assert.ok(user1Balance.eq(BigNumber.from(8)));
    });

    it("setApprovalForAllFor should revoke the ability for an address to transfer token on behalf of another address", async function ({
      contract,
      mint,
      users,
    }) {
      const result = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(result, false);
      const receipt = await users[0].contract
        .setApprovalForAllFor(users[0].address, users[4].address, true)
        .then((tx) => tx.wait());
      assert.equal(receipt.events[0].event, "ApprovalForAll");
      assert.equal(receipt.events[0].args[0], users[0].address);
      assert.equal(receipt.events[0].args[1], users[4].address);
      assert.equal(receipt.events[0].args[2], true);
      const newResult = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(newResult, true);
      const newReceipt = await users[0].contract
        .setApprovalForAllFor(users[0].address, users[4].address, false)
        .then((tx) => tx.wait());
      assert.equal(newReceipt.events[0].event, "ApprovalForAll");
      assert.equal(newReceipt.events[0].args[0], users[0].address);
      assert.equal(newReceipt.events[0].args[1], users[4].address);
      assert.equal(newReceipt.events[0].args[2], false);
      await mint(users[0].address, 8);
      await expectRevert(
        users[4].contract.singleTransferFrom(users[0].address, users[1].address, 1, 8),
        "NOT_AUTHORIZED"
      );
      const user0Balance = await contract.balanceOf(users[0].address, 1);
      assert.ok(user0Balance.eq(BigNumber.from(8)));
      const user1Balance = await contract.balanceOf(users[1].address, 1);
      assert.ok(user1Balance.eq(BigNumber.from(0)));
    });

    it("setApprovalForAll should grant the ability for an address to transfer token on your behalf", async function ({
      contract,
      mint,
      users,
    }) {
      const result = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(result, false);
      const receipt = await users[0].contract.setApprovalForAll(users[4].address, true).then((tx) => tx.wait());
      assert.equal(receipt.events[0].event, "ApprovalForAll");
      assert.equal(receipt.events[0].args[0], users[0].address);
      assert.equal(receipt.events[0].args[1], users[4].address);
      assert.equal(receipt.events[0].args[2], true);
      const newResult = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(newResult, true);
      await mint(users[0].address, 8);
      await users[4].contract.singleTransferFrom(users[0].address, users[1].address, 1, 8);
      const user1Balance = await contract.balanceOf(users[1].address, 1);
      assert.ok(user1Balance.eq(BigNumber.from(8)));
    });

    it("setApprovalForAll should revoke the ability for an address to transfer token on your behalf", async function ({
      contract,
      mint,
      users,
    }) {
      const result = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(result, false);
      const receipt = await users[0].contract.setApprovalForAll(users[4].address, true).then((tx) => tx.wait());
      assert.equal(receipt.events[0].event, "ApprovalForAll");
      assert.equal(receipt.events[0].args[0], users[0].address);
      assert.equal(receipt.events[0].args[1], users[4].address);
      assert.equal(receipt.events[0].args[2], true);
      const newResult = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(newResult, true);
      const newReceipt = await users[0].contract.setApprovalForAll(users[4].address, false).then((tx) => tx.wait());
      assert.equal(newReceipt.events[0].event, "ApprovalForAll");
      assert.equal(newReceipt.events[0].args[0], users[0].address);
      assert.equal(newReceipt.events[0].args[1], users[4].address);
      assert.equal(newReceipt.events[0].args[2], false);
      await mint(users[0].address, 8);
      await expectRevert(
        users[4].contract.singleTransferFrom(users[0].address, users[1].address, 1, 8),
        "NOT_AUTHORIZED"
      );
      const user0Balance = await contract.balanceOf(users[0].address, 1);
      assert.ok(user0Balance.eq(BigNumber.from(8)));
      const user1Balance = await contract.balanceOf(users[1].address, 1);
      assert.ok(user1Balance.eq(BigNumber.from(0)));
    });

    it("isApprovedForAll returns true when an operator has the ability to transfer on behalf of another address or is a superOperator", async function ({
      contract,
      users,
    }) {
      await users[0].contract.setApprovalForAll(users[4].address, true);
      const result = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(result, true);
    });

    it("isApprovedForAll returns false when an operator does not have the ability to transfer on behalf of another address and is not a superOperator", async function ({
      contract,
      users,
    }) {
      const result = await contract.isApprovedForAll(users[0].address, users[4].address);
      assert.equal(result, false);
    });

    it("isAuthorizedToTransfer returns true when the sender is a whitelisted metatransactioncontract operator, superOperator or has been authorized to transfer on behalf of another address", async function ({
      contract,
      users,
    }) {
      await users[0].contract.setApprovalForAll(users[4].address, true);
      const result = await contract.isAuthorizedToTransfer(users[0].address, users[4].address);
      assert.equal(result, true);
    });

    it("isAuthorizedToTransfer returns false when the sender is not a whitelisted metatransactioncontract operator, superOperator and has not been authorized to transfer on behalf of another address", async function ({
      contract,
      users,
    }) {
      const result = await contract.isAuthorizedToTransfer(users[0].address, users[4].address);
      assert.equal(result, false);
    });

    it("isAuthorizedToApprove returns true when the sender is a whitelisted metatransactioncontract operator or superOperator", async function ({
      meta,
      users,
    }) {
      const result = await users[0].contract.isAuthorizedToTransfer(users[0].address, meta);
      assert.equal(result, true);
    });

    it("isAuthorizedToApprove returns false when the sender is not a whitelisted metatransactioncontract operator or a superOperator", async function ({
      users,
    }) {
      const result = await users[1].contract.isAuthorizedToTransfer(users[0].address, users[1].address);
      assert.equal(result, false);
    });
  });

  if (extensions.burn) {
    describe("burn", function (it) {
      it("burnFrom is invalid if transaction is not from sender or superOperator", async function ({mint, users}) {
        await mint(users[0].address, 8);
        await expectRevert(users[0].contract.burnFrom(zeroAddress, 1, 8), "NOT_AUTHORIZED");
      });

      it("burnFrom emits a Transfer event", async function ({mint, users, ERC20SubToken}) {
        await mint(users[0].address, 8);
        const receipt = await users[0].contract.burnFrom(users[0].address, 1, 8).then((tx) => tx.wait());
        const eventsMatching = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
        assert.equal(eventsMatching.length, 1);
        const event = eventsMatching[0];
        assert.equal(event.args[0], users[0].address);
        assert.equal(event.args[1], zeroAddress);
        assert.ok(event.args[2].eq(BigNumber.from(8)));
      });

      it("burnFrom is reverted if the sender is not authorized", async function ({mint, users}) {
        await mint(users[0].address, 8);
        await expectRevert(users[0].contract.burnFrom(users[1].address, 1, 8), "NOT_AUTHORIZED");
      });

      it("burnFrom is successful when sent by the owner of the tokens with user balance being correctly updated", async function ({
        contract,
        mint,
        users,
      }) {
        await mint(users[0].address, 8);
        assert.ok((await contract.balanceOf(users[0].address, 1)).eq(BigNumber.from(8)));
        await users[0].contract.burnFrom(users[0].address, 1, 8);
        assert.ok((await contract.balanceOf(users[0].address, 1)).eq(BigNumber.from(0)));
      });

      it("burnFrom is successful when sent by an operator that has been granted the ability to transfer on behalf of another address", async function ({
        mint,
        users,
      }) {
        await mint(users[0].address, 8);
        await users[0].contract.setApprovalForAll(users[4].address, true);
        await users[4].contract.burnFrom(users[0].address, 1, 8);
      });

      it("batchBurnFrom is invalid from zeroAddress", async function ({batchMint, users}) {
        await batchMint(users[1].address, [5, 6, 7]);
        await expectRevert(
          users[1].contract.batchBurnFrom(zeroAddress, [1, 2, 3], [5, 6, 7]),
          "INVALID_FROM_ZERO_ADDRESS"
        );
      });

      it("batchBurnFrom emits multiple Transfer events", async function ({
        batchMint,
        users,
        ERC20SubToken,
        secondERC20SubToken,
        thirdERC20SubToken,
      }) {
        await batchMint(users[1].address, [5, 6, 7]);
        const receipt = await users[1].contract
          .batchBurnFrom(users[1].address, [1, 2, 3], [5, 6, 7])
          .then((tx) => tx.wait());
        const eventsMatchingFirstSubToken = await findEvents(ERC20SubToken, "Transfer", receipt.blockHash);
        assert.equal(eventsMatchingFirstSubToken.length, 1);
        const firstEvent = eventsMatchingFirstSubToken[0];
        assert.equal(firstEvent.args[0], users[1].address);
        assert.equal(firstEvent.args[1], zeroAddress);
        assert.ok(firstEvent.args[2].eq(BigNumber.from(5)));
        const eventsMatchingSecondSubToken = await findEvents(secondERC20SubToken, "Transfer", receipt.blockHash);
        assert.equal(eventsMatchingSecondSubToken.length, 1);
        const secondEvent = eventsMatchingSecondSubToken[0];
        assert.equal(secondEvent.args[0], users[1].address);
        assert.equal(secondEvent.args[1], zeroAddress);
        assert.ok(secondEvent.args[2].eq(BigNumber.from(6)));
        const eventsMatchingThirdSubToken = await findEvents(thirdERC20SubToken, "Transfer", receipt.blockHash);
        assert.equal(eventsMatchingThirdSubToken.length, 1);
        const thirdEvent = eventsMatchingThirdSubToken[0];
        assert.equal(thirdEvent.args[0], users[1].address);
        assert.equal(thirdEvent.args[1], zeroAddress);
        assert.ok(thirdEvent.args[2].eq(BigNumber.from(7)));
      });

      it("batchBurnFrom is reverted if the sender is not authorized", async function ({batchMint, users}) {
        await batchMint(users[1].address, [5, 6, 7]);
        await expectRevert(users[1].contract.batchBurnFrom(users[2].address, [1, 2, 3], [5, 6, 7]), "NOT_AUTHORIZED");
      });

      it("batchBurnFrom is successful when sent by the owner of the tokens with balances being correctly updated", async function ({
        batchMint,
        users,
        contract,
      }) {
        await batchMint(users[1].address, [5, 6, 7]);
        assert.ok((await contract.balanceOf(users[1].address, 1)).eq(BigNumber.from(5)));
        assert.ok((await contract.balanceOf(users[1].address, 2)).eq(BigNumber.from(6)));
        assert.ok((await contract.balanceOf(users[1].address, 3)).eq(BigNumber.from(7)));
        await users[1].contract.batchBurnFrom(users[1].address, [1, 2, 3], [5, 6, 7]).then((tx) => tx.wait());
        assert.ok((await contract.balanceOf(users[1].address, 1)).eq(BigNumber.from(0)));
        assert.ok((await contract.balanceOf(users[1].address, 2)).eq(BigNumber.from(0)));
        assert.ok((await contract.balanceOf(users[1].address, 3)).eq(BigNumber.from(0)));
      });

      it("batchBurnFrom is successful when sent by an operator that has been granted the ability to transfer on behalf of another address", async function ({
        batchMint,
        users,
      }) {
        await batchMint(users[1].address, [5, 6, 7]);
        await users[1].contract.setApprovalForAll(users[4].address, true).then((tx) => tx.wait());
        await users[4].contract.batchBurnFrom(users[1].address, [1, 2, 3], [5, 6, 7]).then((tx) => tx.wait());
      });
    });
  }

  return tests;
};
