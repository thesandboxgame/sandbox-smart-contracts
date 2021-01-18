// TODO: check correct imports
const {assert, expect} = require('../chai-setup');
const {waitFor} = require('../utils');
// const ethers = require('ethers');
const {ethers} = require('hardhat');
const {BigNumber, constants} = ethers;
const {Contract, ContractFactory} = ethers;
const {Web3Provider} = ethers.providers;
const zeroAddress = constants.AddressZero;

// TODO: check correct ABI
// MintableERC1155Token
const erc1155ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: 'metaTransactionContract',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'admin',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'initialMinter',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'oldAdmin',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'newAdmin',
        type: 'address',
      },
    ],
    name: 'AdminChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'ApprovalForAll',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'metaTransactionProcessor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'MetaTransactionProcessor',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'minter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'Minter',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'superOperator',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'SuperOperator',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'values',
        type: 'uint256[]',
      },
    ],
    name: 'TransferBatch',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
    ],
    name: 'TransferSingle',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'string',
        name: 'value',
        type: 'string',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'URI',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'balanceOf',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'owners',
        type: 'address[]',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
    ],
    name: 'balanceOfBatch',
    outputs: [
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'batchBurnFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'amounts',
        type: 'uint256[]',
      },
    ],
    name: 'batchMint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'burnFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newAdmin',
        type: 'address',
      },
    ],
    name: 'changeAdmin',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getAdmin',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
    ],
    name: 'isApprovedForAll',
    outputs: [
      {
        internalType: 'bool',
        name: 'isOperator',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'who',
        type: 'address',
      },
    ],
    name: 'isMetaTransactionProcessor',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'who',
        type: 'address',
      },
    ],
    name: 'isMinter',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'who',
        type: 'address',
      },
    ],
    name: 'isSuperOperator',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: 'ids',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: 'values',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeBatchTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'to',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'value',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'safeTransferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'approved',
        type: 'bool',
      },
    ],
    name: 'setApprovalForAllFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'metaTransactionProcessor',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'setMetaTransactionProcessor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'minter',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'setMinter',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'superOperator',
        type: 'address',
      },
      {
        internalType: 'bool',
        name: 'enabled',
        type: 'bool',
      },
    ],
    name: 'setSuperOperator',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'id',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
];

module.exports = (init, extensions) => {
  const tests = [];

  function preTest(test) {
    return async () => {
      const {
        ethersProvider,
        contractAddress,
        mint,
        deployer,
        users,
        tokenIds,
        minter,
        deployments,
        receiverAddress,
      } = await init();

      // Receiver
      await deployments.deploy('TestERC1155Receiver', {
        from: deployer,
        contract: 'TestERC1155Receiver',
        args: [
          receiverAddress, // address _tokenContract,
          true, // bool _allowTokensReceived,
          true, // bool _returnCorrectBytes,
          true, // bool _allowBatchTokensReceived,
          true, // bool _returnCorrectBytesOnBatch
        ],
      });

      // Non-receiver
      await deployments.deploy('TestERC1155NonReceiver', {
        from: deployer,
        contract: 'TestERC1155Receiver',
        args: [
          receiverAddress, // address _tokenContract,
          false, // bool _allowTokensReceived,
          true, // bool _returnCorrectBytes,
          false, // bool _allowBatchTokensReceived,
          true, // bool _returnCorrectBytesOnBatch
        ],
      });

      // Receiver - incorrect magic value
      await deployments.deploy('TestERC1155ReceiverIncorrectValue', {
        from: deployer,
        contract: 'TestERC1155Receiver',
        args: [
          receiverAddress, // address _tokenContract,
          true, // bool _allowTokensReceived,
          false, // bool _returnCorrectBytes,
          true, // bool _allowBatchTokensReceived,
          false, // bool _returnCorrectBytesOnBatch
        ],
      });

      const receiver = await ethers.getContract(
        'TestERC1155Receiver',
        deployer
      );

      const nonReceiver = await ethers.getContract(
        'TestERC1155NonReceiver',
        deployer
      );

      const receiverIncorrectValue = await ethers.getContract(
        'TestERC1155ReceiverIncorrectValue',
        deployer
      );

      const contract = new Contract(
        contractAddress,
        erc1155ABI,
        ethersProvider
      );
      const user0 = users[0];
      const user1 = users[1];
      const user2 = users[2];
      const contractAsMinter = contract.connect(
        ethersProvider.getSigner(minter)
      );
      const contractAsUser0 = contract.connect(ethersProvider.getSigner(user0));
      const contractAsUser1 = contract.connect(ethersProvider.getSigner(user1));
      const contractAsUser2 = contract.connect(ethersProvider.getSigner(user2));
      return test({
        receiver,
        nonReceiver,
        receiverIncorrectValue,
        contract,
        contractAsMinter,
        mint,
        contractAsUser0,
        contractAsUser1,
        contractAsUser2,
        minter,
        user0,
        user1,
        user2,
        tokenIds,
        contract,
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

  describe('mint', function (it) {
    it('minting an item results in a TransferSingle event', async function ({
      mint,
      user0,
    }) {
      const {receipt, tokenId} = await mint(8, user0, 1);
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferSingle'
      );
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[1], zeroAddress);
      assert.equal(transferEvent.args[2], user0);
      assert.ok(transferEvent.args[3].eq(BigNumber.from(tokenId)));
    });
  });

  describe('transfers', function (it) {
    it('transferring one instance of an item results in an ERC1155 TransferSingle event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeTransferFrom(minter, user0, tokenIds[1], 1, '0x')
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferSingle'
      );
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[1], minter);
      assert.equal(transferEvent.args[2], user0);
      assert.ok(transferEvent.args[3].eq(tokenIds[1]));
    });

    it('transferring multiple instances of an item results in an ERC1155 TransferSingle event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeTransferFrom(minter, user0, tokenIds[0], 2, '0x')
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferSingle'
      );
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[1], minter);
      assert.equal(transferEvent.args[2], user0);
      assert.ok(transferEvent.args[3].eq(tokenIds[0]));
    });

    it('transferring zero instances of an item results in an ERC1155 TransferSingle event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeTransferFrom(minter, user0, tokenIds[1], 0, '0x')
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferSingle'
      );
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[1], minter);
      assert.equal(transferEvent.args[2], user0);
      assert.ok(transferEvent.args[3].eq(tokenIds[1]));
    });

    it('transferring an item with 1 supply does not result in an ERC1155 TransferBatch event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeTransferFrom(minter, user0, tokenIds[1], 1, '0x')
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferBatch'
      );
      assert.equal(eventsMatching.length, 0);
    });

    it('transferring an item with >1 supply does not result in an ERC1155 TransferBatch event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeTransferFrom(minter, user0, tokenIds[0], 2, '0x')
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferBatch'
      );
      assert.equal(eventsMatching.length, 0);
    });

    it('can be transferred to a normal address', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await contractAsMinter.safeTransferFrom(
        minter,
        user0,
        tokenIds[0],
        4,
        '0x'
      );
    });

    it('cannot be transferred to zero address', async function ({
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeTransferFrom(
          minter,
          zeroAddress,
          tokenIds[0],
          4,
          '0x'
        )
      ).to.be.revertedWith('destination is zero address');
    });

    it('cannot transfer more items than you own', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeTransferFrom(minter, user0, tokenIds[0], 11, '0x')
      ).to.be.revertedWith(`can't substract more than there is`);
    });

    it('cannot transfer an item with supply 1 that you do not own', async function ({
      user0,
      tokenIds,
      contractAsUser0,
      minter,
    }) {
      await expect(
        contractAsUser0.safeTransferFrom(minter, user0, tokenIds[1], 1, '0x')
      ).to.be.revertedWith('Operator not approved');
    });

    it('cannot transfer an item that you do not own', async function ({
      user0,
      tokenIds,
      contractAsUser0,
      minter,
    }) {
      await expect(
        contractAsUser0.safeTransferFrom(minter, user0, tokenIds[0], 8, '0x')
      ).to.be.revertedWith('Operator not approved');
    });

    it('cannot transfer more item of 1 supply', async function ({
      // TODO: reword name of test
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeTransferFrom(minter, user0, tokenIds[1], 2, '0x')
      ).to.be.revertedWith('cannot transfer nft if amount not 1');
    });

    it('cannot transfer to a contract that does not accept ERC1155', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      nonReceiver,
    }) {
      const receiverAddress = nonReceiver.address;
      await expect(
        contractAsMinter.safeTransferFrom(
          minter,
          receiverAddress,
          tokenIds[0],
          1,
          '0x'
        )
      ).to.be.reverted;
    });

    it('cannot transfer multiple instances of an item to a contract that does not accept ERC1155', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      nonReceiver,
    }) {
      const receiverAddress = nonReceiver.address;
      await expect(
        contractAsMinter.safeTransferFrom(
          minter,
          receiverAddress,
          tokenIds[0],
          3,
          '0x'
        )
      ).to.be.reverted;
    });

    it('cannot transfer an item of supply 1 to a contract that does not accept ERC1155', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      nonReceiver,
    }) {
      const receiverAddress = nonReceiver.address;
      await expect(
        contractAsMinter.safeTransferFrom(
          minter,
          receiverAddress,
          tokenIds[1],
          1,
          '0x'
        )
      ).to.be.reverted;
    });

    it('cannot transfer an item of supply 1 to a contract that does not return the correct ERC1155_IS_RECEIVER value', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      receiverIncorrectValue,
    }) {
      const receiverAddress = receiverIncorrectValue.address;
      await expect(
        contractAsMinter.safeTransferFrom(
          minter,
          receiverAddress,
          tokenIds[1],
          1,
          '0x'
        )
      ).to.be.reverted;
    });

    it('cannot transfer an item of supply 1 to a contract that does not return the correct ERC1155_IS_RECEIVER value', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      receiverIncorrectValue,
    }) {
      const receiverAddress = receiverIncorrectValue.address;
      await expect(
        contractAsMinter.safeTransferFrom(
          minter,
          receiverAddress,
          tokenIds[1],
          1,
          '0x'
        )
      ).to.be.reverted;
    });
  });

  describe('batch transfers', function (it) {
    it('transferring an item with 1 supply results in an ERC1155 BatchTransfer event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[1]],
          [1],
          '0x'
        )
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferBatch'
      );
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[1], minter);
      assert.equal(transferEvent.args[2], user0);
      assert.ok(transferEvent.args[3][0].eq(tokenIds[1]));
      assert.ok(transferEvent.args[4][0].eq(1));
    });

    // describe('ordering', function (it) {
    // });

    // describe('approvalForAll', function (it) {
    // });

    // describe('supportsInterface', function (it) {
    // });
  });

  return tests;
};
