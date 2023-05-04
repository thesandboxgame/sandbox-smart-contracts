const {assert, expect} = require('../chai-setup');
const {ethers} = require('hardhat');
const {constants, Contract, ContractFactory} = require('ethers');

const zeroAddress = constants.AddressZero;
const erc721ABI = [
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
        name: 'approved',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Approval',
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
        internalType: 'uint8',
        name: 'processorType',
        type: 'uint8',
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
        indexed: true,
        internalType: 'uint256',
        name: 'tokenId',
        type: 'uint256',
      },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'operator',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'approve',
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
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'approveFor',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
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
        internalType: 'bytes',
        name: 'data',
        type: 'bytes',
      },
    ],
    name: 'batchTransferFrom',
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
        name: 'from',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'id',
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
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'getApproved',
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
        name: 'who',
        type: 'address',
      },
    ],
    name: 'getMetaTransactionProcessorType',
    outputs: [
      {
        internalType: 'uint8',
        name: '',
        type: 'uint8',
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
        name: 'forwarder',
        type: 'address',
      },
    ],
    name: 'isTrustedForwarder',
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
        internalType: 'uint256',
        name: 'id',
        type: 'uint256',
      },
    ],
    name: 'ownerOf',
    outputs: [
      {
        internalType: 'address',
        name: 'owner',
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
        internalType: 'uint8',
        name: 'processorType',
        type: 'uint8',
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
    ],
    name: 'transferFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
const receiver = {
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: '_tokenContract',
          type: 'address',
        },
        {
          internalType: 'bool',
          name: '_allowTokensReceived',
          type: 'bool',
        },
        {
          internalType: 'bool',
          name: '_returnCorrectBytes',
          type: 'bool',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [],
      name: 'acceptTokens',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: '_tokenId',
          type: 'uint256',
        },
        {
          internalType: 'bytes',
          name: '',
          type: 'bytes',
        },
      ],
      name: 'onERC721Received',
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
      inputs: [],
      name: 'rejectTokens',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ],
  bytecode:
    '0x608060405234801561001057600080fd5b5060405161046f38038061046f8339818101604052606081101561003357600080fd5b5080516020820151604090920151600180546001600160a01b0319166001600160a01b03909316929092179091556000805460ff19169215159290921761ff001916610100911515919091021762010000600160b01b0319163362010000021781556103ca9081906100a590396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c8063150b7a021461004657806399a46be31461014e578063f5c89c6f14610158575b600080fd5b6101196004803603608081101561005c57600080fd5b73ffffffffffffffffffffffffffffffffffffffff8235811692602081013590911691604082013591908101906080810160608201356401000000008111156100a457600080fd5b8201836020820111156100b657600080fd5b803590602001918460018302840111640100000000831117156100d857600080fd5b91908080601f016020809104026020016040519081016040528093929190818152602001838380828437600092019190915250929550610160945050505050565b604080517fffffffff000000000000000000000000000000000000000000000000000000009092168252519081900360200190f35b610156610272565b005b6101566102f0565b60015460009073ffffffffffffffffffffffffffffffffffffffff1633146101b95760405162461bcd60e51b81526004018080602001828103825260238152602001806103726023913960400191505060405180910390fd5b60005460ff16610210576040805162461bcd60e51b815260206004820152601360248201527f52656365697665206e6f7420616c6c6f77656400000000000000000000000000604482015290519081900360640190fd5b600054610100900460ff161561024757507f150b7a020000000000000000000000000000000000000000000000000000000061026a565b507f150b7a03000000000000000000000000000000000000000000000000000000005b949350505050565b60005462010000900473ffffffffffffffffffffffffffffffffffffffff1633146102e4576040805162461bcd60e51b815260206004820152601260248201527f6f6e6c79206f776e657220616c6c6f7765640000000000000000000000000000604482015290519081900360640190fd5b6000805460ff19169055565b60005462010000900473ffffffffffffffffffffffffffffffffffffffff163314610362576040805162461bcd60e51b815260206004820152601260248201527f6f6e6c79206f776e657220616c6c6f7765640000000000000000000000000000604482015290519081900360640190fd5b6000805460ff1916600117905556fe6f6e6c792061636365707420746f6b656e436f6e74726163742061732073656e646572a264697066735822122034df058e019e9277fd6a4cde930af75ca3d17a0612cf35c722aaeac519f8ff5964736f6c63430006040033',
};
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
const mandatoryReceiver = {
  abi: [
    {
      inputs: [
        {
          internalType: 'address',
          name: '_tokenContract',
          type: 'address',
        },
        {
          internalType: 'bool',
          name: '_allowTokensReceived',
          type: 'bool',
        },
        {
          internalType: 'bool',
          name: '_returnCorrectBytes',
          type: 'bool',
        },
      ],
      stateMutability: 'nonpayable',
      type: 'constructor',
    },
    {
      inputs: [],
      name: 'acceptTokens',
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
          internalType: 'bytes',
          name: 'data',
          type: 'bytes',
        },
      ],
      name: 'onERC721BatchReceived',
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
          name: '',
          type: 'address',
        },
        {
          internalType: 'address',
          name: '',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: '_tokenId',
          type: 'uint256',
        },
        {
          internalType: 'bytes',
          name: '',
          type: 'bytes',
        },
      ],
      name: 'onERC721Received',
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
      inputs: [],
      name: 'rejectTokens',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
    {
      inputs: [
        {
          internalType: 'bytes4',
          name: 'interfaceId',
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
      stateMutability: 'view',
      type: 'function',
    },
  ],
  bytecode:
    '0x608060405234801561001057600080fd5b5060405161077d38038061077d8339818101604052606081101561003357600080fd5b5080516020820151604090920151600180546001600160a01b0319166001600160a01b03909316929092179091556000805460ff19169215159290921761ff001916610100911515919091021762010000600160b01b0319163362010000021781556106d89081906100a590396000f3fe608060405234801561001057600080fd5b50600436106100675760003560e01c80634b808c46116100505780634b808c46146101c757806399a46be3146102af578063f5c89c6f146102b957610067565b806301ffc9a71461006c578063150b7a02146100bf575b600080fd5b6100ab6004803603602081101561008257600080fd5b50357fffffffff00000000000000000000000000000000000000000000000000000000166102c1565b604080519115158252519081900360200190f35b610192600480360360808110156100d557600080fd5b73ffffffffffffffffffffffffffffffffffffffff82358116926020810135909116916040820135919081019060808101606082013564010000000081111561011d57600080fd5b82018360208201111561012f57600080fd5b8035906020019184600183028401116401000000008311171561015157600080fd5b91908080601f01602080910402602001604051908101604052809392919081815260200183838082843760009201919091525092955061035a945050505050565b604080517fffffffff000000000000000000000000000000000000000000000000000000009092168252519081900360200190f35b610192600480360360808110156101dd57600080fd5b73ffffffffffffffffffffffffffffffffffffffff823581169260208101359091169181019060608101604082013564010000000081111561021e57600080fd5b82018360208201111561023057600080fd5b8035906020019184602083028401116401000000008311171561025257600080fd5b91939092909160208101903564010000000081111561027057600080fd5b82018360208201111561028257600080fd5b803590602001918460018302840111640100000000831117156102a457600080fd5b50909250905061046c565b6102b7610580565b005b6102b76105fe565b60007f5e8bf644000000000000000000000000000000000000000000000000000000007fffffffff000000000000000000000000000000000000000000000000000000008316148061035457507f01ffc9a7000000000000000000000000000000000000000000000000000000007fffffffff000000000000000000000000000000000000000000000000000000008316145b92915050565b60015460009073ffffffffffffffffffffffffffffffffffffffff1633146103b35760405162461bcd60e51b81526004018080602001828103825260238152602001806106806023913960400191505060405180910390fd5b60005460ff1661040a576040805162461bcd60e51b815260206004820152601360248201527f52656365697665206e6f7420616c6c6f77656400000000000000000000000000604482015290519081900360640190fd5b600054610100900460ff161561044157507f150b7a0200000000000000000000000000000000000000000000000000000000610464565b507f150b7a03000000000000000000000000000000000000000000000000000000005b949350505050565b60015460009073ffffffffffffffffffffffffffffffffffffffff1633146104c55760405162461bcd60e51b81526004018080602001828103825260238152602001806106806023913960400191505060405180910390fd5b60005460ff1661051c576040805162461bcd60e51b815260206004820152601360248201527f52656365697665206e6f7420616c6c6f77656400000000000000000000000000604482015290519081900360640190fd5b600054610100900460ff161561055357507f4b808c4600000000000000000000000000000000000000000000000000000000610576565b507f150b7a03000000000000000000000000000000000000000000000000000000005b9695505050505050565b60005462010000900473ffffffffffffffffffffffffffffffffffffffff1633146105f2576040805162461bcd60e51b815260206004820152601260248201527f6f6e6c79206f776e657220616c6c6f7765640000000000000000000000000000604482015290519081900360640190fd5b6000805460ff19169055565b60005462010000900473ffffffffffffffffffffffffffffffffffffffff163314610670576040805162461bcd60e51b815260206004820152601260248201527f6f6e6c79206f776e657220616c6c6f7765640000000000000000000000000000604482015290519081900360640190fd5b6000805460ff1916600117905556fe6f6e6c792061636365707420746f6b656e436f6e74726163742061732073656e646572a264697066735822122098848ae8e8c832ee9afd58561cc3eafb7fdd0a63358f1be3d34b552187c0386564736f6c63430006040033',
};

module.exports = (init, extensions) => {
  const tests = [];

  function preTest(test) {
    return async () => {
      const {contractAddress, mint, deployer, users} = await init();

      const mandatoryReceiverFactory = new ContractFactory(
        mandatoryReceiver.abi,
        mandatoryReceiver.bytecode,
        ethers.provider.getSigner(deployer)
      );
      const receiverFactory = new ContractFactory(
        receiver.abi,
        receiver.bytecode,
        ethers.provider.getSigner(deployer)
      );
      const nonReceivingFactory = new ContractFactory(
        nonReceiving.abi,
        nonReceiving.bytecode,
        ethers.provider.getSigner(deployer)
      );

      function deployMandatoryERC721TokenReceiver(...args) {
        return mandatoryReceiverFactory.deploy(...args);
      }
      function deployNonReceivingContract(...args) {
        return nonReceivingFactory.deploy(...args);
      }
      function deployERC721TokenReceiver(...args) {
        return receiverFactory.deploy(...args);
      }

      const contract = new Contract(
        contractAddress,
        erc721ABI,
        ethers.provider
      );

      const owner = users[0];
      const user0 = users[1];
      const user1 = users[2];
      const user2 = users[3];
      const tokenIds = [];
      for (let i = 0; i < 3; i++) {
        const {tokenId} = await mint(owner);
        tokenIds.push(tokenId);
      }
      const contractAsOwner = contract.connect(
        ethers.provider.getSigner(owner)
      );
      const contractAsUser0 = contract.connect(
        ethers.provider.getSigner(user0)
      );
      const contractAsUser1 = contract.connect(
        ethers.provider.getSigner(user1)
      );
      const contractAsUser2 = contract.connect(
        ethers.provider.getSigner(user2)
      );
      return test({
        deployMandatoryERC721TokenReceiver,
        deployNonReceivingContract,
        deployERC721TokenReceiver,
        contract,
        contractAsOwner,
        mint,
        contractAsUser0,
        contractAsUser1,
        contractAsUser2,
        owner,
        user0,
        user1,
        user2,
        tokenIds,
      });
    };
  }

  // function it(title, test) {
  //   tests.push({title, test: preTest(test)});
  // }

  function describe(title, func) {
    const subTests = [];
    func((title, test) => {
      subTests.push({title, test: preTest(test)});
    });
    tests.push({title, subTests});
  }

  describe('non existing NFT', function (it) {
    it('transfering a non existing NFT fails', async function ({
      contractAsOwner,
      owner,
      user1,
    }) {
      await expect(contractAsOwner.transferFrom(owner, user1, 10000000)).to.be
        .reverted;
    });

    it('tx balanceOf a zero owner fails', async function ({contractAsOwner}) {
      await expect(contractAsOwner.balanceOf(zeroAddress)).to.be.reverted;
    });

    it('call balanceOf a zero owner fails', async function ({contract}) {
      await expect(contract.callStatic.balanceOf(zeroAddress)).to.be.reverted;
    });

    it('tx ownerOf a non existing NFT fails', async function ({
      contractAsOwner,
    }) {
      await expect(contractAsOwner.ownerOf(1000000000)).to.be.reverted;
    });

    it('call ownerOf a non existing NFT fails', async function ({contract}) {
      await expect(contract.callStatic.ownerOf(1000000000)).to.be.reverted;
    });

    it('tx getApproved a non existing NFT fails', async function ({
      contractAsOwner,
    }) {
      await expect(contractAsOwner.getApproved(1000000000)).to.be.reverted;
    });

    it('call getApproved a non existing NFT fails', async function ({
      contract,
    }) {
      await expect(contract.callStatic.getApproved(1000000000)).to.be.reverted;
    });

    // not technically required by erc721 standard //////////////////////////////////////////////
    // it('call isApprovedForAll for a zero address as owner fails', async () => {
    //     await expectRevert(call(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, user1));
    // });

    // it('tx isApprovedForAll for a zero address as owner fails', async () => {
    //     await expectRevert(tx(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, user1));
    // });

    // it('call isApprovedForAll for a zero address as operator fails', async () => {
    //     await expectRevert(call(contract, 'isApprovedForAll', {from: user0, gas}, user1, zeroAddress));
    // });

    // it('tx isApprovedForAll for the zero address as operator fails', async () => {
    //     await expectRevert(tx(contract, 'isApprovedForAll', {from: user0, gas}, user1, zeroAddress));
    // });

    // it('call isApprovedForAll on zero addresses for both owner and operator fails', async () => {
    //     await expectRevert(call(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, zeroAddress));
    // });

    // it('tx isApprovedForAll on zero addresses for both owner and operator fails', async () => {
    //     await expectRevert(tx(contract, 'isApprovedForAll', {from: user0, gas}, zeroAddress, zeroAddress));
    // });
    // ///////////////////////////////////////////////////////////////////////////////////////////////
  });
  describe('balance', function (it) {
    it('balance is zero for new user', async function ({contract, user0}) {
      const balance = await contract.callStatic.balanceOf(user0);
      assert.equal(balance.toNumber(), 0);
    });

    it('balance return correct value', async function ({
      contract,
      contractAsOwner,
      contractAsUser0,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      const balance = await contract.callStatic.balanceOf(user0);
      assert.equal(balance.toNumber(), 0);

      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      let newBalance = await contract.callStatic.balanceOf(user0);
      assert.equal(newBalance.toNumber(), 1);
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[1])
        .then((tx) => tx.wait());
      newBalance = await contract.callStatic.balanceOf(user0);
      assert.equal(newBalance.toNumber(), 2);

      await contractAsUser0
        .transferFrom(user0, user1, tokenIds[0])
        .then((tx) => tx.wait());
      newBalance = await contract.callStatic.balanceOf(user0);
      assert.equal(newBalance.toNumber(), 1);
    });
  });

  describe('mint', function (it) {
    it('mint result in a transfer from 0 event', async function ({
      contract,
      mint,
      user0,
    }) {
      const {receipt, tokenId} = await mint(user0);
      const eventsMatching = await contract.queryFilter(
        contract.filters.Transfer(),
        receipt.blockNumber
      );
      assert.equal(eventsMatching.length, 1);
      const transferEvent = eventsMatching[0];
      assert.equal(transferEvent.args[0], zeroAddress);
      assert.equal(transferEvent.args[1], user0);
      assert(transferEvent.args[2].eq(tokenId));
    });

    it('mint for gives correct owner', async function ({
      contract,
      mint,
      user0,
    }) {
      const {tokenId} = await mint(user0);
      const newOwner = await contract.callStatic.ownerOf(tokenId);
      assert.equal(newOwner, user0);
    });
  });

  if (extensions.burn) {
    describe('burn', function (it) {
      it('burn result in a transfer to 0 event', async function ({
        contract,
        contractAsUser0,
        mint,
        user0,
      }) {
        const {tokenId} = await mint(user0);
        const receipt = await contractAsUser0['burn(uint256)'](
          tokenId
        ).then((tx) => tx.wait());
        const eventsMatching = await contract.queryFilter(
          contract.filters.Transfer(),
          receipt.blockNumber
        );
        assert.equal(eventsMatching.length, 1);
        const transferEvent = eventsMatching[0];
        assert.equal(transferEvent.args[0], user0);
        assert.equal(transferEvent.args[1], zeroAddress);
        expect(transferEvent.args[2]).to.deep.equal(tokenId);
      });
      it('burn result in ownerOf throwing', async function ({
        contract,
        contractAsUser0,
        mint,
        user0,
      }) {
        const {tokenId} = await mint(user0);
        await contract.callStatic.ownerOf(tokenId);
        await contractAsUser0['burn(uint256)'](tokenId).then((tx) => tx.wait());
        await expect(contract.callStatic.ownerOf(tokenId)).to.be.reverted;
      });
    });
  }

  if (extensions.burnAsset) {
    describe('burnAsset', function (it) {
      it('burn result in a transfer to 0 event', async function ({
        contract,
        contractAsUser0,
        mint,
        user0,
      }) {
        const {tokenId} = await mint(user0);
        const receipt = await contractAsUser0['burnFrom(address,uint256)'](
          user0,
          tokenId
        ).then((tx) => tx.wait());
        const eventsMatching = await contract.queryFilter(
          contract.filters.Transfer(),
          receipt.blockNumber
        );
        assert.equal(eventsMatching.length, 1);
        const transferEvent = eventsMatching[0];
        assert.equal(transferEvent.args[0], user0);
        assert.equal(transferEvent.args[1], zeroAddress);
        expect(transferEvent.args[2]).to.deep.equal(tokenId);
      });
      it('burn result in ownerOf throwing', async function ({
        contract,
        contractAsUser0,
        mint,
        user0,
      }) {
        const {tokenId} = await mint(user0);
        await contract.callStatic.ownerOf(tokenId);
        await contractAsUser0['burnFrom(address,uint256)'](
          user0,
          tokenId
        ).then((tx) => tx.wait());
        await expect(contract.callStatic.ownerOf(tokenId)).to.be.reverted;
      });
    });
  }

  if (extensions.batchTransfer) {
    describe('batchTransfer', function (it) {
      it('batch transfer of same NFT ids should fails', async function ({
        contractAsOwner,
        owner,
        user0,
        tokenIds,
      }) {
        await expect(
          contractAsOwner.batchTransferFrom(
            owner,
            user0,
            [tokenIds[1], tokenIds[1], tokenIds[0]],
            '0x'
          )
        ).to.be.reverted;
      });
      // it('batch transfer of same NFT ids should fails even if from == to', async () => {
      //     let reverted = false;
      //     try {
      //         await tx(contract, 'batchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[1], tokenIds[1], tokenIds[0]], '0x');
      //     } catch (e) {
      //         reverted = true;
      //         console.log('ERROR', e);
      //     }
      //     assert.equal(reverted, true);
      //     // await expectRevert(tx(contract, 'batchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[1], tokenIds[1], tokenIds[0]], '0x'));
      // });
      it('batch transfer works', async function ({
        contractAsOwner,
        owner,
        user0,
        tokenIds,
      }) {
        await contractAsOwner
          .batchTransferFrom(owner, user0, tokenIds, '0x')
          .then((tx) => tx.wait());
      });
    });
  }

  if (extensions.mandatoryERC721Receiver) {
    if (extensions.batchTransfer) {
      describe('mandatory batchTransfer', function (it) {
        it('batch transfering to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function ({
          deployERC721TokenReceiver,
          contract,
          contractAsOwner,
          owner,
          tokenIds,
        }) {
          const receiverContract = await deployERC721TokenReceiver(
            contract.address,
            false,
            true
          );
          const receiverAddress = receiverContract.address;
          await contractAsOwner
            .batchTransferFrom(owner, receiverAddress, [tokenIds[0]], '0x')
            .then((tx) => tx.wait());
          const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
          assert.equal(newOwner, receiverAddress);
        });
        it('batch transfering to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function ({
          deployMandatoryERC721TokenReceiver,
          contract,
          contractAsOwner,
          owner,
          tokenIds,
        }) {
          const receiverContract = await deployMandatoryERC721TokenReceiver(
            contract.address,
            false,
            true
          );
          const receiverAddress = receiverContract.address;
          await expect(
            contractAsOwner.batchTransferFrom(
              owner,
              receiverAddress,
              [tokenIds[0]],
              '0x'
            )
          ).to.be.reverted;
        });
        it('batch transfering to a contract that do not accept erc721 token should fail', async function ({
          deployMandatoryERC721TokenReceiver,
          contract,
          contractAsOwner,
          owner,
          tokenIds,
        }) {
          const receiverContract = await deployMandatoryERC721TokenReceiver(
            contract.address,
            false,
            true
          );
          const receiverAddress = receiverContract.address;
          await expect(
            contractAsOwner.batchTransferFrom(
              owner,
              receiverAddress,
              [tokenIds[0]],
              '0x'
            )
          ).to.be.reverted;
        });

        it('batch transfering to a contract that do not return the correct onERC721Received bytes shoudl fail', async function ({
          deployMandatoryERC721TokenReceiver,
          contract,
          contractAsOwner,
          owner,
          tokenIds,
        }) {
          const receiverContract = await deployMandatoryERC721TokenReceiver(
            contract.address,
            true,
            false
          );
          const receiverAddress = receiverContract.address;
          await expect(
            contractAsOwner.batchTransferFrom(
              owner,
              receiverAddress,
              [tokenIds[0]],
              '0x'
            )
          ).to.be.reverted;
        });

        it('batch transfering to a contract that do not implemented mandatory receiver should not fail', async function ({
          deployNonReceivingContract,
          contract,
          contractAsOwner,
          owner,
          tokenIds,
        }) {
          const receiverContract = await deployNonReceivingContract(
            contract.address
          );
          const receiverAddress = receiverContract.address;
          await contractAsOwner
            .batchTransferFrom(owner, receiverAddress, [tokenIds[0]], '0x')
            .then((tx) => tx.wait());
        });

        it('batch transfering to a contract that return the correct onERC721Received bytes shoudl succeed', async function ({
          deployMandatoryERC721TokenReceiver,
          contract,
          contractAsOwner,
          owner,
          tokenIds,
        }) {
          const receiverContract = await deployMandatoryERC721TokenReceiver(
            contract.address,
            true,
            true
          );
          const receiverAddress = receiverContract.address;
          await contractAsOwner
            .batchTransferFrom(owner, receiverAddress, [tokenIds[0]], '0x')
            .then((tx) => tx.wait());
          const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
          assert.equal(newOwner, receiverAddress);
        });
      });
    }
    describe('mandatory transfer', function (it) {
      it('transfering to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function ({
        deployERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployERC721TokenReceiver(
          contract.address,
          false,
          true
        );
        const receiverAddress = receiverContract.address;
        await contractAsOwner
          .transferFrom(owner, receiverAddress, tokenIds[0])
          .then((tx) => tx.wait());
        const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
        assert.equal(newOwner, receiverAddress);
      });
      it('transfering to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function ({
        deployMandatoryERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployMandatoryERC721TokenReceiver(
          contract.address,
          false,
          true
        );
        const receiverAddress = receiverContract.address;
        await expect(
          contractAsOwner.transferFrom(owner, receiverAddress, tokenIds[0])
        ).to.be.reverted;
      });
      it('transfering to a contract that do not accept erc721 token should fail', async function ({
        deployMandatoryERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployMandatoryERC721TokenReceiver(
          contract.address,
          false,
          true
        );
        const receiverAddress = receiverContract.address;
        await expect(
          contractAsOwner.transferFrom(owner, receiverAddress, tokenIds[0])
        ).to.be.reverted;
      });

      it('transfering to a contract that do not return the correct onERC721Received bytes shoudl fail', async function ({
        deployMandatoryERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployMandatoryERC721TokenReceiver(
          contract.address,
          true,
          false
        );
        const receiverAddress = receiverContract.address;
        await expect(
          contractAsOwner.transferFrom(owner, receiverAddress, tokenIds[0])
        ).to.be.reverted;
      });

      it('transfering to a contract that do not implemented mandatory receiver should not fail', async function ({
        deployNonReceivingContract,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployNonReceivingContract(
          contract.address
        );
        const receiverAddress = receiverContract.address;
        await contractAsOwner
          .transferFrom(owner, receiverAddress, tokenIds[0])
          .then((tx) => tx.wait());
      });

      it('transfering to a contract that return the correct onERC721Received bytes shoudl succeed', async function ({
        deployMandatoryERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployMandatoryERC721TokenReceiver(
          contract.address,
          true,
          true
        );
        const receiverAddress = receiverContract.address;
        await contractAsOwner
          .transferFrom(owner, receiverAddress, tokenIds[0])
          .then((tx) => tx.wait());
        const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
        assert.equal(newOwner, receiverAddress);
      });

      // it('transfering to a contract that return the correct onERC721Received bytes shoudl succeed', async () => {
      //     const receiverContract = await deployContract(user0, 'TestMandatoryERC721TokenReceiver', contract.address, true, true);
      //     const receiverAddress = receiverContract.address;
      //     await ransferFrom(user0, user0, receiverAddress, tokenIds[0]);
      //     const newOwner = await call(contract, 'ownerOf', null, tokenIds[0]);
      //     assert.equal(newOwner, receiverAddress);
      // });
    });
  }

  if (extensions.batchTransfer) {
    describe('safe batch transfer', function (it) {
      it('safe batch transfer of same NFT ids should fails', async function ({
        contractAsOwner,
        tokenIds,
        owner,
        user0,
      }) {
        await expect(
          contractAsOwner.safeBatchTransferFrom(
            owner,
            user0,
            [tokenIds[0], tokenIds[1], tokenIds[0]],
            '0x'
          )
        ).to.be.reverted;
      });
      // it('safe batch transfer of same NFT ids should fails even if from == to', async () => {
      //     let reverted = false;
      //     try {
      //         await tx(contract, 'safeBatchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[0], tokenIds[1], tokenIds[0]], '0x');
      //     } catch (e) {
      //         reverted = true;
      //         console.log('ERROR', e);
      //     }
      //     assert.equal(reverted, true);
      //     // await expectRevert(tx(contract, 'safeBatchTransferFrom', {from: user0, gas}, user0, user0, [tokenIds[0], tokenIds[1], tokenIds[0]], '0x'));
      // });
      it('safe batch transfer works', async function ({
        contractAsOwner,
        tokenIds,
        owner,
        user0,
      }) {
        await contractAsOwner
          .safeBatchTransferFrom(owner, user0, tokenIds, '0x')
          .then((tx) => tx.wait());
        // console.log('gas used for safe batch transfer = ' + receipt.gasUsed);
      });

      it('safe batch transfering to a contract that do not implemented onERC721Received should fail', async function ({
        deployNonReceivingContract,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployNonReceivingContract(
          contract.address
        );
        const receiverAddress = receiverContract.address;
        await expect(
          contractAsOwner.safeBatchTransferFrom(
            owner,
            receiverAddress,
            tokenIds,
            '0x'
          )
        ).to.be.reverted;
      });

      it('safe batch transfering to a contract that implements onERC721Received should succeed', async function ({
        deployERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployERC721TokenReceiver(
          contract.address,
          true,
          true
        );
        const receiverAddress = receiverContract.address;
        await expect(
          contractAsOwner.safeBatchTransferFrom(
            owner,
            receiverAddress,
            tokenIds,
            '0x'
          )
        ).to.not.be.reverted;
      });
    });
  }

  describe('transfer', function (it) {
    it('transfering one NFT results in one erc721 transfer event', async function ({
      contractAsOwner,
      owner,
      user0,
      tokenIds,
    }) {
      const receipt = await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      const transferEvents = receipt.events.filter(
        (v) => v.event === 'Transfer'
      );
      assert.equal(transferEvents.length, 1);
      const transferEvent = transferEvents[0];
      assert.equal(transferEvent.args[0], owner);
      assert.equal(transferEvent.args[1], user0);
      assert(transferEvent.args[2].eq(tokenIds[0]));
    });
    it('transfering one NFT change to correct owner', async function ({
      contract,
      contractAsOwner,
      owner,
      user0,
      tokenIds,
    }) {
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
      assert.equal(newOwner, user0);
    });

    it('transfering one NFT increase new owner balance', async function ({
      contract,
      contractAsOwner,
      owner,
      user0,
      tokenIds,
    }) {
      const balanceBefore = await contract.callStatic.balanceOf(user0);
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      const balanceAfter = await contract.callStatic.balanceOf(user0);
      assert(balanceBefore.add(1).eq(balanceAfter));
    });

    it('transfering one NFT decrease past owner balance', async function ({
      contract,
      contractAsOwner,
      owner,
      user0,
      tokenIds,
    }) {
      const balanceBefore = await contract.callStatic.balanceOf(owner);
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      const balanceAfter = await contract.callStatic.balanceOf(owner);
      assert(balanceBefore.sub(1).eq(balanceAfter));
    });

    it('transfering from without approval should fails', async function ({
      contractAsUser0,
      owner,
      user0,
      tokenIds,
    }) {
      await expect(contractAsUser0.transferFrom(owner, user0, tokenIds[0])).to
        .be.reverted;
    });

    it('transfering to zero address should fails', async function ({
      contractAsOwner,
      owner,
      tokenIds,
    }) {
      await expect(
        contractAsOwner.transferFrom(owner, zeroAddress, tokenIds[0])
      ).to.be.reverted;
    });

    it('transfering to a contract that do not accept erc721 token should not fail', async function ({
      deployERC721TokenReceiver,
      contract,
      contractAsOwner,
      owner,
      tokenIds,
    }) {
      const receiverContract = await deployERC721TokenReceiver(
        contract.address,
        false,
        true
      );
      const receiverAddress = receiverContract.address;
      await contractAsOwner
        .transferFrom(owner, receiverAddress, tokenIds[0])
        .then((tx) => tx.wait());
      const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
      assert.equal(newOwner, receiverAddress);
    });
  });

  function testSafeTransfers(it, data) {
    const prefix = data ? 'data:' + data + ' : ' : '';
    let safeTransferFrom = (contract, from, to, tokenId) => {
      return contract['safeTransferFrom(address,address,uint256)'](
        from,
        to,
        tokenId
      ).then((tx) => tx.wait());
    };

    if (data) {
      safeTransferFrom = (contract, from, to, tokenId) => {
        return contract['safeTransferFrom(address,address,uint256,bytes)'](
          from,
          to,
          tokenId,
          data
        ).then((tx) => tx.wait());
      };
    }

    it(
      prefix + 'safe transfering one NFT results in one erc721 transfer event',
      async function ({contractAsOwner, owner, user0, tokenIds}) {
        const receipt = await safeTransferFrom(
          contractAsOwner,
          owner,
          user0,
          tokenIds[0]
        );
        const eventsMatching = receipt.events.filter(
          (v) => v.event === 'Transfer'
        );
        assert.equal(eventsMatching.length, 1);
        const transferEvent = eventsMatching[0];
        assert.equal(transferEvent.args[0], owner);
        assert.equal(transferEvent.args[1], user0);
        assert(transferEvent.args[2].eq(tokenIds[0]));
      }
    );

    it(
      prefix + 'safe transfering to zero address should fails',
      async function ({contractAsOwner, owner, tokenIds}) {
        await expect(
          safeTransferFrom(contractAsOwner, owner, zeroAddress, tokenIds[0])
        ).to.be.reverted;
      }
    );

    it(
      prefix + 'safe transfering one NFT change to correct owner',
      async function ({contract, contractAsOwner, owner, user0, tokenIds}) {
        await safeTransferFrom(contractAsOwner, owner, user0, tokenIds[0]);
        const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
        assert.equal(newOwner, user0);
      }
    );

    it(
      prefix + 'safe transfering from without approval should fails',
      async function ({contractAsUser0, owner, user0, tokenIds}) {
        await expect(
          safeTransferFrom(contractAsUser0, owner, user0, tokenIds[0])
        ).to.be.reverted;
      }
    );

    it(
      prefix +
        'safe transfering to a contract that do not accept erc721 token should fail',
      async function ({
        deployERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployERC721TokenReceiver(
          contract.address,
          false,
          true
        );
        const receiverAddress = receiverContract.address;
        await expect(
          safeTransferFrom(contractAsOwner, owner, receiverAddress, tokenIds[0])
        ).to.be.reverted;
      }
    );

    it(
      prefix +
        'safe transfering to a contract that do not return the correct onERC721Received bytes shoudl fail',
      async function ({
        deployERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployERC721TokenReceiver(
          contract.address,
          true,
          false
        );
        const receiverAddress = receiverContract.address;
        await expect(
          safeTransferFrom(contractAsOwner, owner, receiverAddress, tokenIds[0])
        ).to.be.reverted;
      }
    );

    it(
      prefix +
        'safe transfering to a contract that do not implemented onERC721Received should fail',
      async function ({
        deployNonReceivingContract,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployNonReceivingContract(
          contract.address
        );
        const receiverAddress = receiverContract.address;
        await expect(
          safeTransferFrom(contractAsOwner, owner, receiverAddress, tokenIds[0])
        ).to.be.reverted;
      }
    );

    it(
      prefix +
        'safe transfering to a contract that return the correct onERC721Received bytes shoudl succeed',
      async function ({
        deployERC721TokenReceiver,
        contract,
        contractAsOwner,
        owner,
        tokenIds,
      }) {
        const receiverContract = await deployERC721TokenReceiver(
          contract.address,
          true,
          true
        );
        const receiverAddress = receiverContract.address;
        await safeTransferFrom(
          contractAsOwner,
          owner,
          receiverAddress,
          tokenIds[0]
        );
        const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
        assert.equal(newOwner, receiverAddress);
      }
    );
  }

  describe('safeTransfer', function (it) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testSafeTransfers(it);
  });
  describe('safeTransfer with empty bytes', function (it) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testSafeTransfers(it, '0x');
  });
  describe('safeTransfer with data', function (it) {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testSafeTransfers(it, '0xff56fe3422');
  });

  describe('ERC165', function (it) {
    it('claim to support erc165', async function ({contract}) {
      const result = await contract.callStatic.supportsInterface('0x01ffc9a7');
      assert.equal(result, true);
    });

    it('claim to support base erc721 interface', async function ({contract}) {
      const result = await contract.callStatic.supportsInterface('0x80ac58cd');
      assert.equal(result, true);
    });

    it('claim to support erc721 metadata interface', async function ({
      contract,
    }) {
      const result = await contract.callStatic.supportsInterface('0x5b5e139f');
      assert.equal(result, true);
    });

    it('does not claim to support random interface', async function ({
      contract,
    }) {
      const result = await contract.callStatic.supportsInterface('0x88888888');
      assert.equal(result, false);
    });

    it('does not claim to support the invalid interface', async function ({
      contract,
    }) {
      const result = await contract.callStatic.supportsInterface('0xFFFFFFFF');
      assert.equal(result, false);
    });
  });

  describe('Approval', function (it) {
    it('approving emit Approval event', async function ({
      contractAsOwner,
      owner,
      user0,
      tokenIds,
    }) {
      const receipt = await contractAsOwner
        .approve(user0, tokenIds[0])
        .then((tx) => tx.wait());
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'Approval'
      );
      assert.equal(eventsMatching.length, 1);
      const eventValues = eventsMatching[0].args;
      assert.equal(eventValues[0], owner);
      assert.equal(eventValues[1], user0);
      assert(eventValues[2].eq(tokenIds[0]));
    });

    it('removing approval emit Approval event', async function ({
      contractAsOwner,
      owner,
      user0,
      tokenIds,
    }) {
      await contractAsOwner.approve(user0, tokenIds[0]).then((tx) => tx.wait());
      const receipt = await contractAsOwner
        .approve(zeroAddress, tokenIds[0])
        .then((tx) => tx.wait());
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'Approval'
      );
      assert.equal(eventsMatching.length, 1);
      const eventValues = eventsMatching[0].args;
      assert.equal(eventValues[0], owner);
      assert.equal(eventValues[1], zeroAddress);
      assert(eventValues[2].eq(tokenIds[0]));
    });

    it('approving update the approval status', async function ({
      contract,
      contractAsOwner,
      user1,
      tokenIds,
    }) {
      await contractAsOwner.approve(user1, tokenIds[0]).then((tx) => tx.wait());
      const approvedAddress = await contract.callStatic.getApproved(
        tokenIds[0]
      );
      assert.equal(approvedAddress, user1);
    });

    it('cant approve if not owner or operator ', async function ({
      contractAsOwner,
      owner,
      user0,
      tokenIds,
    }) {
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      await expect(contractAsOwner.approve(user0, tokenIds[0])).to.be.reverted;
    });

    it('approving allows transfer from the approved party', async function ({
      contract,
      contractAsOwner,
      contractAsUser0,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      await contractAsOwner.approve(user0, tokenIds[0]).then((tx) => tx.wait());
      await contractAsUser0
        .transferFrom(owner, user1, tokenIds[0])
        .then((tx) => tx.wait());
      const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
      assert.equal(newOwner, user1);
    });

    it('transfering the approved NFT results in aproval reset for it', async function ({
      contract,
      contractAsOwner,
      contractAsUser1,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      await contractAsOwner.approve(user1, tokenIds[0]).then((tx) => tx.wait());
      await contractAsUser1
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      const approvedAddress = await contract.callStatic.getApproved(
        tokenIds[0]
      );
      assert.equal(approvedAddress, zeroAddress);
    });

    it('transfering the approved NFT again will fail', async function ({
      contractAsOwner,
      contractAsUser1,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      await contractAsOwner.approve(user1, tokenIds[0]).then((tx) => tx.wait());
      await contractAsUser1
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      await expect(contractAsUser1.transferFrom(user0, owner, tokenIds[0])).to
        .be.reverted;
    });

    it('approval by operator works', async function ({
      contract,
      contractAsOwner,
      contractAsUser0,
      contractAsUser1,
      owner,
      user0,
      user1,
      user2,
      tokenIds,
    }) {
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());

      await contractAsUser0
        .setApprovalForAllFor(user0, user1, true)
        .then((tx) => tx.wait());
      // await tx(contract, 'approve', {from: user0, gas}, user1, tokenId);
      await contractAsUser1
        .transferFrom(user0, user2, tokenIds[0])
        .then((tx) => tx.wait());
      const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
      assert.equal(newOwner, user2);
    });
  });

  describe('ApprovalForAll', function (it) {
    it('approving all emit ApprovalForAll event', async function ({
      contractAsOwner,
      owner,
      user0,
    }) {
      const receipt = await contractAsOwner
        .setApprovalForAll(user0, true)
        .then((tx) => tx.wait());
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'ApprovalForAll'
      );
      assert.equal(eventsMatching.length, 1);
      const eventValues = eventsMatching[0].args;
      assert.equal(eventValues[0], owner);
      assert.equal(eventValues[1], user0);
      assert.equal(eventValues[2], true);
    });

    it('approving all update the approval status', async function ({
      contract,
      contractAsOwner,
      owner,
      user0,
    }) {
      await contractAsOwner
        .setApprovalForAll(user0, true)
        .then((tx) => tx.wait());
      const isUser0Approved = await contract.callStatic.isApprovedForAll(
        owner,
        user0
      );
      assert.equal(isUser0Approved, true);
    });

    it('unsetting approval for all should update the approval status', async function ({
      contract,
      contractAsOwner,
      owner,
      user0,
    }) {
      await contractAsOwner
        .setApprovalForAll(user0, true)
        .then((tx) => tx.wait());
      await contractAsOwner
        .setApprovalForAll(user0, false)
        .then((tx) => tx.wait());
      const isUser0Approved = await contract.callStatic.isApprovedForAll(
        owner,
        user0
      );
      assert.equal(isUser0Approved, false);
    });

    it('unsetting approval for all should emit ApprovalForAll event', async function ({
      contractAsOwner,
      owner,
      user0,
    }) {
      await contractAsOwner
        .setApprovalForAll(user0, true)
        .then((tx) => tx.wait());
      const receipt = await contractAsOwner
        .setApprovalForAll(user0, false)
        .then((tx) => tx.wait());
      const eventsMatching = receipt.events.filter(
        (v) => v.event === 'ApprovalForAll'
      );
      assert.equal(eventsMatching.length, 1);
      const eventValues = eventsMatching[0].args;
      assert.equal(eventValues[0], owner);
      assert.equal(eventValues[1], user0);
      assert.equal(eventValues[2], false);
    });

    it('approving for all allows transfer from the approved party', async function ({
      contract,
      contractAsOwner,
      contractAsUser0,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      await contractAsOwner
        .setApprovalForAll(user0, true)
        .then((tx) => tx.wait());
      await contractAsUser0
        .transferFrom(owner, user1, tokenIds[0])
        .then((tx) => tx.wait());
      const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
      assert.equal(newOwner, user1);
    });
    it('transfering one NFT do not results in aprovalForAll reset', async function ({
      contract,
      contractAsOwner,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      await contractAsOwner
        .setApprovalForAll(user1, true)
        .then((tx) => tx.wait());
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      const isUser1Approved = await contract.callStatic.isApprovedForAll(
        owner,
        user1
      );
      assert.equal(isUser1Approved, true);
    });

    it('approval for all does not grant approval on a transfered NFT', async function ({
      contractAsOwner,
      contractAsUser1,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      await contractAsOwner
        .setApprovalForAll(user1, true)
        .then((tx) => tx.wait());
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      await expect(contractAsUser1.transferFrom(user0, user1, tokenIds[0])).to
        .be.reverted;
    });

    it('approval for all set before will work on a transfered NFT', async function ({
      contract,
      contractAsOwner,
      contractAsUser0,
      contractAsUser1,
      owner,
      user0,
      user1,
      tokenIds,
    }) {
      await contractAsUser0
        .setApprovalForAll(user1, true)
        .then((tx) => tx.wait());
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());
      await contractAsUser1
        .transferFrom(user0, user1, tokenIds[0])
        .then((tx) => tx.wait());
      const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
      assert.equal(newOwner, user1);
    });

    it('approval for all allow to set individual nft approve', async function ({
      contract,
      contractAsOwner,
      contractAsUser0,
      contractAsUser2,
      owner,
      user0,
      user1,
      user2,
      tokenIds,
    }) {
      await contractAsOwner
        .transferFrom(owner, user0, tokenIds[0])
        .then((tx) => tx.wait());

      await contractAsUser0
        .setApprovalForAll(user1, true)
        .then((tx) => tx.wait());

      await contractAsUser0.approve(user2, tokenIds[0]).then((tx) => tx.wait());
      await contractAsUser2
        .transferFrom(user0, user2, tokenIds[0])
        .then((tx) => tx.wait());
      const newOwner = await contract.callStatic.ownerOf(tokenIds[0]);
      assert.equal(newOwner, user2);
    });
  });

  return tests;
};
