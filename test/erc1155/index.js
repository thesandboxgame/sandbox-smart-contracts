const {assert, expect} = require('../chai-setup');
const {waitFor} = require('../utils');
const {ethers} = require('hardhat');
const {BigNumber, constants} = ethers;
const {Contract} = ethers;
const zeroAddress = constants.AddressZero;

// MintableERC1155Token ABI
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

module.exports = (init) => {
  const tests = [];

  function preTest(test) {
    // Get contract-specific params
    return async () => {
      const {
        ethersProvider,
        contractAddress,
        mint,
        deployer,
        users,
        tokenIds,
        batchIds,
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

      // Receiver - provides an incorrect magic value
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
      const contractAsDeployer = contract.connect(
        ethersProvider.getSigner(deployer)
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
        contractAsDeployer,
        mint,
        contractAsUser0,
        contractAsUser1,
        contractAsUser2,
        minter,
        deployer,
        user0,
        user1,
        user2,
        tokenIds,
        batchIds,
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

    it('cannot transfer an item of supply >1 to a contract that does not return the correct ERC1155_IS_RECEIVER value', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      receiverIncorrectValue,
      contract,
    }) {
      const receiverAddress = receiverIncorrectValue.address;
      await expect(
        contractAsMinter.safeTransferFrom(
          minter,
          receiverAddress,
          tokenIds[0],
          3,
          '0x'
        )
      ).to.be.reverted;
      const balance = await contract.balanceOf(receiverAddress, tokenIds[0]);
      expect(balance).to.be.equal(0);
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

    it('transferring an item with >1 supply results in an ERC1155 BatchTransfer event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0]],
          [3],
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
      assert.ok(transferEvent.args[3][0].eq(tokenIds[0]));
      assert.ok(transferEvent.args[4][0].eq(3));
    });

    it('transferring zero items with 1 supply results in an ERC1155 BatchTransfer event', async function ({
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
          [0],
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
      assert.ok(transferEvent.args[4][0].eq(0));
    });

    it('transferring zero items with >1 supply results in an ERC1155 BatchTransfer event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0]],
          [0],
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
      assert.ok(transferEvent.args[3][0].eq(tokenIds[0]));
      assert.ok(transferEvent.args[4][0].eq(0));
    });

    it('transferring empty list results in an ERC1155 BatchTransfer event', async function ({
      user0,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(minter, user0, [], [], '0x')
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferBatch'
      );
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[1], minter);
      assert.equal(transferEvent.args[2], user0);
      assert.equal(transferEvent.args[3].length, 0);
      assert.equal(transferEvent.args[4].length, 0);
    });

    it('transferring multiple items results in an ERC1155 BatchTransfer event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0], tokenIds[2], tokenIds[1], tokenIds[3], tokenIds[4]],
          [3, 4, 1, 1, 3],
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
      assert.ok(transferEvent.args[3][0].eq(tokenIds[0]));
      assert.ok(transferEvent.args[3][1].eq(tokenIds[2]));
      assert.ok(transferEvent.args[3][2].eq(tokenIds[1]));
      assert.ok(transferEvent.args[3][3].eq(tokenIds[3]));
      assert.ok(transferEvent.args[3][4].eq(tokenIds[4]));
      assert.ok(transferEvent.args[4][0].eq(3));
      assert.ok(transferEvent.args[4][1].eq(4));
      assert.ok(transferEvent.args[4][2].eq(1));
      assert.ok(transferEvent.args[4][3].eq(1));
      assert.ok(transferEvent.args[4][4].eq(3));
    });

    it('transferring multiple items including zero amount results in an ERC1155 BatchTransfer event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0], tokenIds[2], tokenIds[1], tokenIds[3], tokenIds[4]],
          [3, 0, 1, 0, 3],
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
      assert.ok(transferEvent.args[3][0].eq(tokenIds[0]));
      assert.ok(transferEvent.args[3][1].eq(tokenIds[2]));
      assert.ok(transferEvent.args[3][2].eq(tokenIds[1]));
      assert.ok(transferEvent.args[3][3].eq(tokenIds[3]));
      assert.ok(transferEvent.args[3][4].eq(tokenIds[4]));
      assert.ok(transferEvent.args[4][0].eq(3));
      assert.ok(transferEvent.args[4][1].eq(0));
      assert.ok(transferEvent.args[4][2].eq(1));
      assert.ok(transferEvent.args[4][3].eq(0));
      assert.ok(transferEvent.args[4][4].eq(3));
    });

    it('transferring an item with 1 supply with batch transfer does not result in a TransferSingle event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0]],
          [1],
          '0x'
        )
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferSingle'
      );
      assert.equal(eventsMatching.length, 0);
    });

    it('transferring an item with >1 supply with batch transfer does not result in a TransferSingle event', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0]],
          [3],
          '0x'
        )
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'TransferSingle'
      );
      assert.equal(eventsMatching.length, 0);
    });

    it('can use batch transfer to send tokens to a normal address', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0]],
          [3],
          '0x'
        )
      );
    });

    it('cannot batch transfer the same token twice and exceed the amount owned', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0], tokenIds[1], tokenIds[0]],
          [2, 1, 1000],
          '0x'
        )
      ).to.be.revertedWith(`can't substract more than there is`);
    });

    it('can use batch transfer to send token twice if there is sufficient amount owned', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0], tokenIds[1], tokenIds[0]],
          [2, 1, 1],
          '0x'
        )
      );
    });

    it('cannot batch transfer tokens to zeroAddress', async function ({
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          zeroAddress,
          [tokenIds[0], tokenIds[1], tokenIds[0]],
          [2, 1, 1],
          '0x'
        )
      ).to.be.revertedWith('destination is zero address');
    });

    it('cannot batch transfer tokens if array lengths do not match', async function ({
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          zeroAddress,
          [tokenIds[0], tokenIds[1], tokenIds[0]],
          [2, 1],
          '0x'
        )
      ).to.be.revertedWith('Inconsistent array length between args');
    });

    it('cannot batch transfer more than the amount owned', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[0]],
          [11],
          '0x'
        )
      ).to.be.revertedWith(`can't substract more than there is`);
    });

    it('cannot batch transfer more items of 1 supply', async function ({
      user0,
      tokenIds,
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          [tokenIds[1]],
          [2],
          '0x'
        )
      ).to.be.revertedWith(`cannot transfer nft if amount not 1`);
    });

    it('cannot batch transfer to a contract that does not accept ERC1155', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      nonReceiver,
    }) {
      await expect(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          nonReceiver.address,
          [tokenIds[0], tokenIds[1], tokenIds[2]],
          [2, 1, 3],
          '0x'
        )
      ).to.be.reverted;
    });

    it('cannot batch transfer to a contract that does not return the correct magic value', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      receiverIncorrectValue,
    }) {
      await expect(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          receiverIncorrectValue.address,
          [tokenIds[0], tokenIds[1], tokenIds[2]],
          [2, 1, 3],
          '0x'
        )
      ).to.be.reverted;
    });

    it('can batch transfer to a contract that does accept ERC1155 and which returns the correct magic value', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      receiver,
    }) {
      await contractAsMinter.safeBatchTransferFrom(
        minter,
        receiver.address,
        [tokenIds[0], tokenIds[1], tokenIds[2]],
        [2, 1, 3],
        '0x'
      );
    });

    it('can batch transfer item with 1 or more supply at the same time', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      contract,
      user0,
    }) {
      const tokenIdsToTransfer = [tokenIds[0], tokenIds[1]];
      const balancesToTransfer = [3, 1];

      await contractAsMinter.safeBatchTransferFrom(
        minter,
        user0,
        tokenIdsToTransfer,
        balancesToTransfer,
        '0x'
      );
      for (let i = 0; i < tokenIdsToTransfer.length; i++) {
        const tokenId = tokenIdsToTransfer[i];
        const expectedbalance = balancesToTransfer[i];
        const balance = await contract.balanceOf(user0, tokenId);
        assert.equal(balance, expectedbalance);
      }
    });

    it('can obtain balance of batch', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      contract,
      user0,
    }) {
      const tokenIdsToTransfer = [tokenIds[0], tokenIds[1]];
      const balancesToTransfer = [3, 1];

      await contractAsMinter.safeBatchTransferFrom(
        minter,
        user0,
        tokenIdsToTransfer,
        balancesToTransfer,
        '0x'
      );

      const balances = await contract.balanceOfBatch(
        [user0, user0],
        tokenIdsToTransfer
      );
      for (let i = 0; i < tokenIdsToTransfer.length; i++) {
        assert.equal(balancesToTransfer[i], balances[i]);
      }
    });
  });

  describe('approvalForAll', function (it) {
    it('setting approval results in ApprovalForAll event', async function ({
      contractAsDeployer,
      minter,
      deployer,
    }) {
      const receipt = await waitFor(
        contractAsDeployer.setApprovalForAll(minter, true)
      );
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'ApprovalForAll'
      );
      assert.equal(eventsMatching.length, 1);
      const event = eventsMatching[0];
      assert.equal(event.args[0], deployer);
      assert.equal(event.args[1], minter);
      assert.equal(event.args[2], true);
    });

    it('setting approval fails if sender is operator', async function ({
      contractAsMinter,
      minter,
    }) {
      await expect(
        contractAsMinter.setApprovalForAll(minter, true)
      ).to.be.revertedWith('sender = operator');
    });

    it('operator cannot transfer without approval', async function ({
      contractAsUser0,
      minter,
      user0,
      tokenIds,
    }) {
      await expect(
        contractAsUser0.safeTransferFrom(minter, user0, tokenIds[1], 1, '0x')
      ).to.be.revertedWith('Operator not approved');
    });

    it('operator can transfer after approval', async function ({
      contractAsUser0,
      contractAsMinter,
      minter,
      user0,
      user1,
      tokenIds,
    }) {
      await expect(
        contractAsUser0.safeTransferFrom(minter, user1, tokenIds[0], 1, '0x')
      ).to.be.revertedWith('Operator not approved');
      await contractAsMinter.setApprovalForAll(user0, true);
      const result = await contractAsMinter.isApprovedForAll(minter, user0);
      assert.equal(result, true);

      await contractAsUser0.safeTransferFrom(
        minter,
        user1,
        tokenIds[0],
        1,
        '0x'
      );
    });

    it('operator cannot transfer after approval is removed', async function ({
      contractAsUser0,
      contractAsMinter,
      minter,
      user0,
      user1,
      tokenIds,
    }) {
      await expect(
        contractAsUser0.safeTransferFrom(minter, user1, tokenIds[0], 1, '0x')
      ).to.be.revertedWith('Operator not approved');
      await contractAsMinter.setApprovalForAll(user0, true);
      await contractAsUser0.safeTransferFrom(
        minter,
        user1,
        tokenIds[1],
        1,
        '0x'
      );
      await contractAsMinter.setApprovalForAll(user0, false);
      await expect(
        contractAsUser0.safeTransferFrom(minter, user1, tokenIds[0], 1, '0x')
      ).to.be.revertedWith('Operator not approved');
    });
  });

  describe('supportsInterface', function (it) {
    it('contract claims to supports ERC165', async function ({contract}) {
      const result = await contract.supportsInterface('0x01ffc9a7');
      assert.equal(result, true);
    });

    it('contract does not claim to support random interface', async function ({
      contract,
    }) {
      const result = await contract.supportsInterface('0x77777777');
      assert.equal(result, false);
    });

    it('contract does not claim to support invalid interface', async function ({
      contract,
    }) {
      const result = await contract.supportsInterface('0xFFFFFFFF');
      assert.equal(result, false);
    });
  });

  describe('ordering', function (it) {
    const amounts = [10, 5, 8, 9, 10, 6, 8, 8, 10, 12, 1, 1, 1];
    async function testOrder(
      contractAsMinter,
      minter,
      user0,
      batchIds,
      order,
      balancesToTransfer
    ) {
      const tokenIdsToTransfer = [];
      let generateTransferAmount = false;
      if (!balancesToTransfer) {
        generateTransferAmount = true;
        balancesToTransfer = [];
      }
      for (let i = 0; i < order.length; i++) {
        tokenIdsToTransfer.push(batchIds[order[i]]);
        if (generateTransferAmount) {
          balancesToTransfer.push(amounts[order[i]]);
        }
      }

      const receipt = await waitFor(
        contractAsMinter.safeBatchTransferFrom(
          minter,
          user0,
          tokenIdsToTransfer,
          balancesToTransfer,
          '0x'
        )
      );
      for (let i = 0; i < tokenIdsToTransfer.length; i++) {
        const tokenId = tokenIdsToTransfer[i];
        const expectedbalance = balancesToTransfer[i];
        const balance = await contractAsMinter.balanceOf(user0, tokenId);
        assert.equal(balance, expectedbalance);
      }
      return receipt;
    }

    async function testOrder2(
      contractAsMinter,
      minter,
      user0,
      batchIds,
      order,
      balancesToTransfer,
      order2,
      balancesToTransfer2
    ) {
      const tokenIdsToTransfer = [];
      const reverse = {};
      for (let i = 0; i < order.length; i++) {
        const tokenId = batchIds[order[i]];
        tokenIdsToTransfer.push(tokenId);
        reverse[tokenId] = i;
      }
      const tokenIdsToTransfer2 = [];
      const reverse2 = {};
      for (let i = 0; i < order2.length; i++) {
        const tokenId = batchIds[order2[i]];
        tokenIdsToTransfer2.push(tokenId);
        reverse2[tokenId] = i;
      }
      await contractAsMinter.safeBatchTransferFrom(
        minter,
        user0,
        tokenIdsToTransfer,
        balancesToTransfer,
        '0x'
      );
      await contractAsMinter.safeBatchTransferFrom(
        minter,
        user0,
        tokenIdsToTransfer2,
        balancesToTransfer2,
        '0x'
      );
      for (let i = 0; i < tokenIdsToTransfer2.length; i++) {
        const tokenId = tokenIdsToTransfer2[i];
        const expectedbalance = BigNumber.from(balancesToTransfer2[i] || 0).add(
          BigNumber.from(balancesToTransfer[reverse[tokenId]] || 0)
        );
        const balance = await contractAsMinter.balanceOf(user0, tokenId);
        expect(balance).to.be.equal(expectedbalance);
      }
    }

    it('transfer empty array', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, []);
    });

    it('transfer multiple items in any order (i)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, [3, 4, 5]);
    });

    it('transfer multiple items in any order (ii)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, [3, 1, 2]);
    });

    it('transfer multiple items in any order (iii)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, [3, 10, 2]);
    });

    it('transfer multiple items in any order (iv)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, [
        3,
        4,
        10,
        9,
        2,
      ]);
    });

    it('transfer multiple items in any order (v)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, [3, 4, 2]);
    });

    it('transfer multiple items in any order (vi)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, [3, 4, 9, 2]);
    });

    it('transfer multiple items in any order (vii)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(contractAsMinter, minter, user0, batchIds, [3, 4, 10, 5]);
    });

    it('transfer multiple items in any order (viii)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder(
        contractAsMinter,
        minter,
        user0,
        batchIds,
        [10, 3, 4, 5],
        [1, 2, 2, 2]
      );
    });

    it('transfer multiple items in any order twice (i)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder2(
        contractAsMinter,
        minter,
        user0,
        batchIds,
        [3, 2],
        [2, 2],
        [3, 10, 2],
        [2, 1, 2]
      );
    });

    it('transfer multiple items in any order twice (ii)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder2(
        contractAsMinter,
        minter,
        user0,
        batchIds,
        [3, 4, 9, 2],
        [2, 2, 2, 2],
        [3, 4, 10, 9, 2],
        [2, 2, 1, 2, 2]
      );
    });

    it('transfer multiple items in any order twice (iii)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder2(
        contractAsMinter,
        minter,
        user0,
        batchIds,
        [3, 4, 2],
        [2, 2, 2],
        [3, 4, 2],
        [2, 2, 2]
      );
    });

    it('transfer multiple items in any order twice (iv)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder2(
        contractAsMinter,
        minter,
        user0,
        batchIds,
        [3, 4, 9, 2],
        [2, 2, 2, 2],
        [3, 4, 9, 2],
        [2, 2, 2, 2]
      );
    });

    it('transfer multiple items in any order twice (v)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder2(
        contractAsMinter,
        minter,
        user0,
        batchIds,
        [3, 4, 5],
        [2, 2, 2],
        [3, 4, 10, 5],
        [2, 2, 1, 2]
      );
    });

    it('transfer multiple items in any order twice (vi)', async ({
      batchIds,
      contractAsMinter,
      minter,
      user0,
    }) => {
      await testOrder2(
        contractAsMinter,
        minter,
        user0,
        batchIds,
        [3, 4, 5],
        [2, 2, 2],
        [10, 3, 4, 5],
        [1, 2, 2, 2]
      );
    });
  });

  return tests;
};
