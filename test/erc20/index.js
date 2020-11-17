const {assert, expect} = require('../chai-setup');
const {ethers} = require('hardhat');
const {waitFor} = require('../utils');
const {BigNumber, constants} = require('ethers');

const zeroAddress = constants.AddressZero;

const {Contract} = ethers;
const erc20ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
    signature: '0x06fdde03',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approve',
    outputs: [
      {
        name: 'success',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
    signature: '0x095ea7b3',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
    signature: '0x18160ddd',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'burnFor',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
    signature: '0x1dd319cb',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'from',
        type: 'address',
      },
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transferFrom',
    outputs: [
      {
        name: 'success',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
    signature: '0x23b872dd',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'approveFor',
    outputs: [
      {
        name: 'success',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
    signature: '0x2b991746',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [
      {
        name: '',
        type: 'uint8',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
    signature: '0x313ce567',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'burn',
    outputs: [
      {
        name: '',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
    signature: '0x42966c68',
  },
  {
    constant: true,
    inputs: [],
    name: 'getAdmin',
    outputs: [
      {
        name: '',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
    signature: '0x6e9960c3',
  },
  {
    constant: true,
    inputs: [
      {
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        name: '',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
    signature: '0x70a08231',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [
      {
        name: '',
        type: 'string',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
    signature: '0x95d89b41',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'to',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'transfer',
    outputs: [
      {
        name: 'success',
        type: 'bool',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
    signature: '0xa9059cbb',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'target',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'paidCall',
    outputs: [
      {
        name: '',
        type: 'bytes',
      },
    ],
    payable: true,
    stateMutability: 'payable',
    type: 'function',
    signature: '0xbb1e23cb',
  },
  {
    constant: false,
    inputs: [
      {
        name: 'target',
        type: 'address',
      },
      {
        name: 'amount',
        type: 'uint256',
      },
      {
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'approveAndCall',
    outputs: [
      {
        name: '',
        type: 'bytes',
      },
    ],
    payable: true,
    stateMutability: 'payable',
    type: 'function',
    signature: '0xcae9ca51',
  },
  {
    constant: true,
    inputs: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'spender',
        type: 'address',
      },
    ],
    name: 'allowance',
    outputs: [
      {
        name: 'remaining',
        type: 'uint256',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
    signature: '0xdd62ed3e',
  },
  {
    inputs: [
      {
        name: 'sandAdmin',
        type: 'address',
      },
      {
        name: 'executionAdmin',
        type: 'address',
      },
      {
        name: 'beneficiary',
        type: 'address',
      },
    ],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'constructor',
    signature: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
    signature:
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        name: 'spender',
        type: 'address',
      },
      {
        indexed: false,
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'Approval',
    type: 'event',
    signature:
      '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925',
  },
];

module.exports = (init, extensions, {initialSupply} = {}) => {
  const tests = [];

  function preTest(test) {
    return async function () {
      const {ethersProvider, contractAddress, users, mint} = await init();

      const contract = new Contract(contractAddress, erc20ABI, ethersProvider);

      const usersWithContracts = [];
      for (const user of users) {
        usersWithContracts.push({
          address: user,
          contract: contract.connect(ethersProvider.getSigner(user)),
          initialBalance: BigNumber.from(0),
        });
      }

      const initialBalance = BigNumber.from('1000000');
      await mint(usersWithContracts[0].address, initialBalance);
      usersWithContracts[0].initialBalance = initialBalance;

      return test({
        contract,
        mint,
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

  function it(title, test) {
    tests.push({title, test: preTest(test)});
  }

  if (initialSupply) {
    it('deploy should emit Transfer event', async function () {
      // TODO
      // const events = await getPastEvents(owner.contract, TransferEvent);
      // assert.equal(events[0].returnValues[0], "0x0000000000000000000000000000000000000000");
      // assert.equal(events[0].returnValues[1], initialOwner);
      // assert.equal(events[0].returnValues[2], initialSupply);
    });
  }

  // TODO mint

  it('transfering from users[0] to users[1] should adjust their balance accordingly', async function ({
    users,
    contract,
  }) {
    const amount = BigNumber.from('1000');
    await waitFor(users[0].contract.transfer(users[1].address, amount));
    const user0Balance = await contract.callStatic.balanceOf(users[0].address);
    const user1Balance = await contract.callStatic.balanceOf(users[1].address);
    expect(user1Balance).to.equal(users[1].initialBalance.add(amount));
    expect(user0Balance).to.equal(users[0].initialBalance.sub(amount));
  });

  it('transfering from users[0] more token that it owns should fails', async function ({
    users,
  }) {
    await expect(
      users[0].contract.transfer(
        users[1].address,
        users[0].initialBalance.add('1000')
      )
    ).to.be.reverted;
  });

  it('transfering to address zero should fails', async function ({users}) {
    await expect(users[0].contract.transfer(zeroAddress, '1000')).to.be
      .reverted;
  });
  it('transfering to address(this) should fail', async function ({
    users,
    contract,
  }) {
    await expect(users[0].contract.transfer(contract.address, '1000')).to.be
      .reverted;
  });
  it('transfering from users[0] to users[1] by users[0] should adjust their balance accordingly', async function ({
    users,
    contract,
  }) {
    const amount = BigNumber.from('1000');
    await waitFor(
      users[0].contract.transferFrom(users[0].address, users[1].address, amount)
    );
    const user0Balance = await contract.callStatic.balanceOf(users[0].address);
    const user1Balance = await contract.callStatic.balanceOf(users[1].address);
    expect(user1Balance).to.equal(users[1].initialBalance.add(amount));
    expect(user0Balance).to.equal(users[0].initialBalance.sub(amount));
  });

  it('transfering from users[0] by users[1] should fails', async function ({
    users,
  }) {
    await expect(
      users[1].contract.transferFrom(
        users[0].address,
        users[1].address,
        users[0].initialBalance
      )
    ).to.be.reverted;
  });

  it('transfering from users[0] to users[1] should trigger a transfer event', async function ({
    users,
  }) {
    const amount = BigNumber.from('1000');
    const receipt = await waitFor(
      users[0].contract.transfer(users[1].address, amount)
    );
    const event = receipt.events.find((e) => e.event == 'Transfer');
    assert.equal(event.args[0].toString(), users[0].address.toString());
    assert.equal(event.args[1].toString(), users[1].address.toString());
    assert.equal(event.args[2].toString(), amount.toString());
  });

  it('transfering from users[0] to users[1] by operator after approval, should adjust their balance accordingly', async function ({
    users,
    contract,
  }) {
    const amount = BigNumber.from('1000');
    const operator = users[2];
    await waitFor(users[0].contract.approve(operator.address, amount));
    await waitFor(
      operator.contract.transferFrom(users[0].address, users[1].address, amount)
    );
    const user0Balance = await contract.callStatic.balanceOf(users[0].address);
    const user1Balance = await contract.callStatic.balanceOf(users[1].address);
    expect(user1Balance).to.equal(users[1].initialBalance.add(amount));
    expect(user0Balance).to.equal(users[0].initialBalance.sub(amount));
  });

  it('transfering from users[0] to users[1] by operator after approval and approval reset, should fail', async function ({
    users,
  }) {
    const amount = BigNumber.from('1000');
    const operator = users[2];
    await waitFor(users[0].contract.approve(operator.address, amount));
    await waitFor(users[0].contract.approve(operator.address, 0));
    await expect(
      operator.contract.transferFrom(users[0].address, users[1].address, amount)
    ).to.be.reverted;
  });
  it('transfering from users[0] to users[1] by operator after approval, should adjust the operator alowance accordingly', async function ({
    users,
    contract,
  }) {
    const amountApproved = BigNumber.from('1010');
    const amount = BigNumber.from('1000');
    const operator = users[2];
    await waitFor(users[0].contract.approve(operator.address, amountApproved));
    await waitFor(
      operator.contract.transferFrom(users[0].address, users[1].address, amount)
    );
    const allowance = await contract.callStatic.allowance(
      users[0].address,
      operator.address
    );
    assert.equal(allowance.toString(), amountApproved.sub(amount).toString());
  });

  if (extensions.EIP717) {
    it('transfering from users[0] to users[1] by operator after max approval (2**256-1), should NOT adjust the operator allowance', async function ({
      users,
      contract,
    }) {
      const amountApproved = BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      );
      const amount = BigNumber.from('1000');
      const operator = users[2];
      await waitFor(
        users[0].contract.approve(operator.address, amountApproved)
      );
      await waitFor(
        operator.contract.transferFrom(
          users[0].address,
          users[1].address,
          amount
        )
      );
      const allowance = await contract.callStatic.allowance(
        users[0].address,
        operator.address
      );
      assert.equal(
        allowance.toHexString(),
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      );
    });
  } else {
    it('transfering from users[0] to users[1] by operator after max approval (2**256-1), should still adjust the operator allowance', async function ({
      users,
      contract,
    }) {
      const amountApproved = BigNumber.from(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      );
      const amount = BigNumber.from('1000');
      const operator = users[2];
      await waitFor(
        users[0].contract.approve(operator.address, amountApproved)
      );
      await waitFor(
        operator.contract.transferFrom(
          users[0].address,
          users[1].address,
          amount
        )
      );
      const allowance = await contract.callStatic.allowance(
        users[0].address,
        operator.address
      );
      assert.equal(
        allowance.toHexString(),
        amountApproved.sub(amount).toHexString()
      );
    });
  }

  it('transfering from users[0] to users[1] by operator after approval, but without enough allowance, should fails', async function ({
    users,
  }) {
    const amountApproved = BigNumber.from('1010');
    const amount = amountApproved.add(1);
    const operator = users[2];
    await waitFor(users[0].contract.approve(operator.address, amountApproved));
    await expect(
      operator.contract.transferFrom(users[0].address, users[1].address, amount)
    ).to.be.reverted;
  });

  it('transfering from users[0] by operators without pre-approval should fails', async function ({
    users,
  }) {
    const operator = users[2];
    await expect(
      operator.contract.transferFrom(
        users[0].address,
        users[1].address,
        users[0].initialBalance
      )
    ).to.be.reverted;
  });

  it('approving operator should trigger a Approval event', async function ({
    users,
  }) {
    const operator = users[2];
    const receipt = await waitFor(
      users[0].contract.approve(operator.address, '1000')
    );
    const event = receipt.events.find((e) => e.event == 'Approval');
    assert.equal(event.args[2].toString(), '1000');
  });
  it('disapproving operator (allowance to zero) should trigger a Approval event', async function ({
    users,
  }) {
    const operator = users[2];
    await waitFor(users[0].contract.approve(operator.address, '1000'));
    const receipt = await waitFor(
      users[0].contract.approve(operator.address, '0')
    );
    const event = receipt.events.find((e) => e.event == 'Approval');
    assert.equal(event.args[2].toString(), '0');
  });

  it('approve to address zero should fails', async function ({users}) {
    await expect(users[0].contract.approve(zeroAddress, '1000')).to.be.reverted;
  });

  if (extensions.burn) {
    describe('burn', function (it) {
      it('burn should emit erc20 transfer event to zero address', async function ({
        users,
      }) {
        const receipt = await waitFor(users[0].contract.burn('1000'));
        const event = receipt.events.find((e) => e.event == 'Transfer');
        assert.equal(event.args[0], users[0].address);
        assert.equal(
          event.args[1],
          '0x0000000000000000000000000000000000000000'
        );
        assert.equal(event.args[2].toString(), '1000');
      });

      it('burning more token that a user owns should fails', async function ({
        users,
      }) {
        await expect(users[0].contract.burn(users[0].initialBalance.add(1))).to
          .be.reverted;
      });
    });
  }
  return tests;
};
