const {assert} = require("chai-local");
const ethers = require("ethers");
const {expectRevert, zeroAddress, emptyBytes} = require("testUtils");
const {Contract} = ethers;
const {Web3Provider} = ethers.providers;
const erc20ABI = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
    signature: "0x06fdde03",
  },
  {
    constant: false,
    inputs: [
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
    signature: "0x095ea7b3",
  },
  {
    constant: true,
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
    signature: "0x18160ddd",
  },
  {
    constant: false,
    inputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "burnFor",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
    signature: "0x1dd319cb",
  },
  {
    constant: false,
    inputs: [
      {
        name: "from",
        type: "address",
      },
      {
        name: "to",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
    signature: "0x23b872dd",
  },
  {
    constant: false,
    inputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "spender",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approveFor",
    outputs: [
      {
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
    signature: "0x2b991746",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [
      {
        name: "",
        type: "uint8",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
    signature: "0x313ce567",
  },
  {
    constant: false,
    inputs: [
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "burn",
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
    signature: "0x42966c68",
  },
  {
    constant: true,
    inputs: [],
    name: "getAdmin",
    outputs: [
      {
        name: "",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
    signature: "0x6e9960c3",
  },
  {
    constant: true,
    inputs: [
      {
        name: "owner",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
    signature: "0x70a08231",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [
      {
        name: "",
        type: "string",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
    signature: "0x95d89b41",
  },
  {
    constant: false,
    inputs: [
      {
        name: "to",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        name: "success",
        type: "bool",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
    signature: "0xa9059cbb",
  },
  {
    constant: false,
    inputs: [
      {
        name: "target",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
      {
        name: "data",
        type: "bytes",
      },
    ],
    name: "paidCall",
    outputs: [
      {
        name: "",
        type: "bytes",
      },
    ],
    payable: true,
    stateMutability: "payable",
    type: "function",
    signature: "0xbb1e23cb",
  },
  {
    constant: false,
    inputs: [
      {
        name: "target",
        type: "address",
      },
      {
        name: "amount",
        type: "uint256",
      },
      {
        name: "data",
        type: "bytes",
      },
    ],
    name: "approveAndCall",
    outputs: [
      {
        name: "",
        type: "bytes",
      },
    ],
    payable: true,
    stateMutability: "payable",
    type: "function",
    signature: "0xcae9ca51",
  },
  {
    constant: true,
    inputs: [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "spender",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        name: "remaining",
        type: "uint256",
      },
    ],
    payable: false,
    stateMutability: "view",
    type: "function",
    signature: "0xdd62ed3e",
  },
  {
    inputs: [
      {
        name: "sandAdmin",
        type: "address",
      },
      {
        name: "executionAdmin",
        type: "address",
      },
      {
        name: "beneficiary",
        type: "address",
      },
    ],
    payable: false,
    stateMutability: "nonpayable",
    type: "constructor",
    signature: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        name: "value",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
    signature: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        name: "value",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
    signature: "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925",
  },
];

module.exports = (init, extensions) => {
  const tests = [];

  function preTest(test) {
    return async function () {
      const {ethereum, contractAddress, users} = await init();
      const ethersProvider = new Web3Provider(ethereum);

      const contract = new Contract(contractAddress, erc20ABI, ethersProvider);

      const usersWithContracts = [];
      for (const user of users.slice(1)) {
        usersWithContracts.push({
          address: user,
          contract: contract.connect(ethersProvider.getSigner(user)),
        });
      }
      const owner = {
        address: users[0],
        contract: contract.connect(ethersProvider.getSigner(users[0])),
      };

      return test({
        owner,
        users: usersWithContracts,
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

  it("deploy should emit Transfer event", async function ({owner}) {
    const events = await getPastEvents(owner.contract, TransferEvent);
    assert.equal(events[0].returnValues[0], "0x0000000000000000000000000000000000000000");
    assert.equal(events[0].returnValues[1], initialOwner);
    assert.equal(events[0].returnValues[2], totalSupply);
  });

  it("transfering from users[0] to users[1] should adjust their balance accordingly", async function ({users}) {
    await transfer(contract, users[1], "1000", {from: users[0], gas});
    const user0Balance = await getERC20Balance(contract, users[0]);
    const user1Balance = await getERC20Balance(contract, users[1]);
    assert.equal(user1Balance.toString(10), "1000");
    assert.equal(user0Balance.toString(10), new BN(initialBalance).sub(new BN("1000")).toString(10));
  });

  it("transfering from users[0] more token that it owns should fails", async function ({users}) {
    await expectRevert(
      transfer(contract, users[1], new BN(initialBalance).add(new BN("1000")).toString(10), {from: users[0], gas})
    );
  });

  it("transfering to address zero should fails", async function ({users}) {
    await expectRevert(transfer(contract, zeroAddress, "1000", {from: users[0], gas}));
  });

  it("transfering from users[0] to users[1] by users[0] should adjust their balance accordingly", async function ({
    users,
  }) {
    await transferFrom(contract, users[0], users[1], "1000", {from: users[0], gas});
    const user0Balance = await getERC20Balance(contract, users[0]);
    const user1Balance = await getERC20Balance(contract, users[1]);
    assert.equal(user1Balance.toString(10), "1000");
    assert.equal(user0Balance.toString(10), new BN(initialBalance).sub(new BN("1000")).toString(10));
  });

  it("transfering from users[0] by users[1] should fails", async function ({users}) {
    await expectRevert(transferFrom(contract, users[0], users[1], "1000", {from: users[1], gas}));
  });

  it("transfering from users[0] to users[1] should trigger a transfer event", async function ({users}) {
    const receipt = await transfer(contract, users[1], "1000", {from: users[0], gas});
    const events = await getEventsFromReceipt(contract, TransferEvent, receipt);
    assert.equal(events[0].returnValues[0], users[0]);
    assert.equal(events[0].returnValues[1], users[1]);
    assert.equal(events[0].returnValues[2], "1000");
  });

  it("transfering from users[0] to users[1] by operator after approval, should adjust their balance accordingly", async function ({
    users,
  }) {
    await approve(contract, operator, "1000", {from: users[0], gas});
    await transferFrom(contract, users[0], users[1], "1000", {from: operator, gas});
    const user0Balance = await getERC20Balance(contract, users[0]);
    const user1Balance = await getERC20Balance(contract, users[1]);
    assert.equal(user1Balance.toString(10), "1000");
    assert.equal(user0Balance.toString(10), new BN(initialBalance).sub(new BN("1000")).toString(10));
  });
  it("transfering from users[0] to users[1] by operator after approval and approval reset, should fail", async function ({
    users,
  }) {
    await approve(contract, operator, "1000", {from: users[0], gas});
    await approve(contract, operator, "0", {from: users[0], gas});
    await expectRevert(transferFrom(contract, users[0], users[1], "1000", {from: operator, gas}));
  });
  it("transfering from users[0] to users[1] by operator after approval, should adjust the operator alowance accordingly", async function ({
    users,
  }) {
    await approve(contract, operator, "1010", {from: users[0], gas});
    await transferFrom(contract, users[0], users[1], "1000", {from: operator, gas});
    const allowance = await getERC20Allowance(contract, users[0], operator);
    assert.equal(allowance.toString(10), "10");
  });
  it("transfering from users[0] to users[1] by operator after max approval (2**256-1), should NOT adjust the operator allowance", async function ({
    users,
  }) {
    await approve(contract, operator, "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", {
      from: users[0],
      gas,
    });
    await transferFrom(contract, users[0], users[1], "1000", {from: operator, gas});
    const allowance = await getERC20Allowance(contract, users[0], operator);
    assert.equal(allowance.toString("hex"), "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  });
  it("transfering from users[0] to users[1] by operator after approval, but without enough allowance, should fails", async function ({
    users,
  }) {
    await approve(contract, operator, "1010", {from: users[0], gas});
    await expectRevert(transferFrom(contract, users[0], users[1], "2000000", {from: operator, gas}));
  });
  it("transfering from users[0] by operators without pre-approval should fails", async function ({users}) {
    await expectRevert(transferFrom(contract, users[0], users[1], "1000", {from: operator, gas}));
  });
  it("approving operator should trigger a Approval event", async function ({users}) {
    const receipt = await approve(contract, operator, "1000", {from: users[0], gas});
    const events = await getEventsFromReceipt(contract, ApproveEvent, receipt);
    assert.equal(events[0].returnValues[2], "1000");
  });
  it("disapproving operator (allowance to zero) should trigger a Approval event", async function ({users}) {
    const receipt = await approve(contract, operator, "0", {from: users[0], gas});
    const events = await getEventsFromReceipt(contract, ApproveEvent, receipt);
    assert.equal(events[0].returnValues[2], "0");
  });

  it("approve to address zero should fails", async function ({users}) {
    await expectRevert(approve(contract, zeroAddress, "1000", {from: users[0], gas}));
  });

  if (testBurn) {
    desccribe("burn", async function () {
      it("burn should emit erc20 transfer event to zero address", async function ({users}) {
        const receipt = await burn(contract, "1000", {from: users[0], gas});
        const events = await getEventsFromReceipt(contract, TransferEvent, receipt);
        assert.equal(events[0].returnValues[0], users[0]);
        assert.equal(events[0].returnValues[1], "0x0000000000000000000000000000000000000000");
        assert.equal(events[0].returnValues[2], "1000");
      });

      it("burning more token that a user owns should fails", async function ({users}) {
        await expectRevert(burn(contract, "2000000", {from: users[0], gas}));
      });
    });
  }
  return tests;
};
