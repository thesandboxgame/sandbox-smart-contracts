// TODO: check correct imports
const {assert, expect} = require('../chai-setup');
const {waitFor} = require('../utils');
const ethers = require('ethers');
const {BigNumber, constants} = require('ethers');
const {Contract, ContractFactory} = ethers;
const {Web3Provider} = ethers.providers;
const zeroAddress = constants.AddressZero;

// TODO: check correct ABIs
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

// ERC1155TokenReceiver
const receiver = {
  contractName: 'ERC1155TokenReceiver',
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: 'operator',
          type: 'address',
        },
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
          name: 'values',
          type: 'uint256[]',
        },
        {
          internalType: 'bytes',
          name: 'data',
          type: 'bytes',
        },
      ],
      name: 'onERC1155BatchReceived',
      outputs: [
        {
          internalType: 'bytes4',
          name: '',
          type: 'bytes4',
        },
      ],
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
          name: 'value',
          type: 'uint256',
        },
        {
          internalType: 'bytes',
          name: 'data',
          type: 'bytes',
        },
      ],
      name: 'onERC1155Received',
      outputs: [
        {
          internalType: 'bytes4',
          name: '',
          type: 'bytes4',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
  bytecode: '0x',
};

// contract ERC20
const nonReceiving = {
  abi: [
    {
      inputs: [
        {
          internalType: 'contract ERC20',
          name: '_token',
          type: 'address',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [],
      name: 'fail',
      outputs: [],
      stateMutability: 'pure',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: '_amount',
          type: 'uint256',
        },
      ],
      name: 'give',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '_from',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: '_amount',
          type: 'uint256',
        },
      ],
      name: 'take',
      outputs: [
        {
          internalType: 'bool',
          name: '',
          type: 'bool',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
  bytecode:
    '0x608060405234801561001057600080fd5b5060405161039f38038061039f8339818101604052602081101561003357600080fd5b5051600080546001600160a01b039092166001600160a01b031992831617905560018054909116331790556103328061006d6000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80635218020814610046578063a9cc471814610093578063f00388f71461009d575b600080fd5b61007f6004803603604081101561005c57600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81351690602001356100d6565b604080519115158252519081900360200190f35b61009b61018b565b005b61007f600480360360408110156100b357600080fd5b5073ffffffffffffffffffffffffffffffffffffffff81351690602001356101f4565b60008054604080517f23b872dd00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff868116600483015230602483015260448201869052915191909216916323b872dd91606480830192602092919082900301818787803b15801561015857600080fd5b505af115801561016c573d6000803e3d6000fd5b505050506040513d602081101561018257600080fd5b50519392505050565b604080517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048083019190915260248201527f6661696c00000000000000000000000000000000000000000000000000000000604482015290519081900360640190fd5b60015460009073ffffffffffffffffffffffffffffffffffffffff16331461027d57604080517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152601360248201527f6f6e6c79206f6e7765722063616e206769766500000000000000000000000000604482015290519081900360640190fd5b60008054604080517fa9059cbb00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8781166004830152602482018790529151919092169263a9059cbb92604480820193602093909283900390910190829087803b15801561015857600080fdfea264697066735822122091466859c825b114e195bc77fe6c1387de9f16fcd42863c6af51a91ba41eddbe64736f6c63430006040033',
};

// ERC1155TokenReceiver
const mandatoryReceiver = {
  contractName: 'ERC1155TokenReceiver',
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: 'operator',
          type: 'address',
        },
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
          name: 'values',
          type: 'uint256[]',
        },
        {
          internalType: 'bytes',
          name: 'data',
          type: 'bytes',
        },
      ],
      name: 'onERC1155BatchReceived',
      outputs: [
        {
          internalType: 'bytes4',
          name: '',
          type: 'bytes4',
        },
      ],
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
          name: 'value',
          type: 'uint256',
        },
        {
          internalType: 'bytes',
          name: 'data',
          type: 'bytes',
        },
      ],
      name: 'onERC1155Received',
      outputs: [
        {
          internalType: 'bytes4',
          name: '',
          type: 'bytes4',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
  bytecode: '0x',
};

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
      } = await init();

      const mandatoryReceiverFactory = new ContractFactory(
        mandatoryReceiver.abi,
        mandatoryReceiver.bytecode,
        ethersProvider.getSigner(deployer)
      );
      const receiverFactory = new ContractFactory(
        receiver.abi,
        receiver.bytecode,
        ethersProvider.getSigner(deployer)
      );
      const nonReceivingFactory = new ContractFactory(
        nonReceiving.abi,
        nonReceiving.bytecode,
        ethersProvider.getSigner(deployer)
      );

      function deployMandatoryERC1155TokenReceiver(...args) {
        return mandatoryReceiverFactory.deploy(...args);
      }
      function deployNonReceivingContract(...args) {
        return nonReceivingFactory.deploy(...args);
      }
      function deployERC1155TokenReceiver(...args) {
        return receiverFactory.deploy(...args);
      }
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
        deployMandatoryERC1155TokenReceiver,
        deployNonReceivingContract,
        deployERC1155TokenReceiver,
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

  // add tests
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
    beforeEach(() => {
      // TODO: reset tokens for transfers
    });

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
      // TODO: reword
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
      deployNonReceivingContract,
      contract,
    }) {
      const receiverContract = await deployNonReceivingContract(
        contract.address
      );
      const receiverAddress = receiverContract.address;
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
      deployNonReceivingContract,
      contract,
    }) {
      const receiverContract = await deployNonReceivingContract(
        contract.address
      );
      const receiverAddress = receiverContract.address;
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
      deployNonReceivingContract,
      contract,
    }) {
      const receiverContract = await deployNonReceivingContract(
        contract.address
      );
      const receiverAddress = receiverContract.address;
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

    // it('cannot transfer an item of supply 1 to a contract that does not return the correct ERC1155_IS_RECEIVER value', async function ({
    //   tokenIds,
    //   contractAsMinter,
    //   minter,
    //   deployNonReceivingContract,
    //   contract,
    // }) {
    //   const receiverContract = await deployNonReceivingContract( // TODO: magic value setup
    //     contract.address
    //   );
    //   const receiverAddress = receiverContract.address;
    //   await expect(
    //     contractAsMinter.safeTransferFrom(
    //       minter,
    //       receiverAddress,
    //       tokenIds[1],
    //       1,
    //       '0x'
    //     )
    //   ).to.be.reverted;
    // });

    it('can transfer to a contract that does accept ERC1155', async function ({
      tokenIds,
      contractAsMinter,
      minter,
      deployERC1155TokenReceiver,
      contract,
    }) {
      const receiverContract = await deployERC1155TokenReceiver(
        contract.address // TODO: review args
      ); // TODO: review diff between Mandatory Receiver and Receiver
      const receiverAddress = receiverContract.address;
      await contractAsMinter.safeTransferFrom(
        minter,
        receiverAddress,
        tokenIds[0],
        3,
        '0x'
      );
      // TODO: balance check
    });
  });

  // batch transfers
  // ordering
  // approvalForAll
  // supportsInterface

  return tests;
};
