import 'dotenv/config';
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomiclabs/hardhat-ethers';
import 'hardhat-deploy';
import {addForkingSupport, addNodeAndMnemonic} from './utils/hardhatConfig';
import './tasks/importedPackages';

// Package name : solidity source code path
const importedPackages = {
  '@sandbox-smart-contracts/giveaway': 'contracts/SignedMultiGiveaway.sol',
  '@sandbox-smart-contracts/marketplace': [
    'contracts/royalties-registry/RoyaltiesRegistry.sol',
    'contracts/exchange/OrderValidator.sol',
    'contracts/exchange/Exchange.sol',
    'contracts/exchange/AssetMatcher.sol',
  ],
};

const namedAccounts = {
  deployer: {
    default: 1,
    mainnet: '0xe19ae8F9B36Ca43D12741288D0e311396140DF6F',
    polygon: '0x7074BB056C53ACC0b6091dd3FAe591aa3A4acC88',
    goerli: '0xA796AE911621E00809E0E7C8f0AD6BF118E5139e',
    mumbai: '0x5F890c9522dCE5670d741D4277BFCC2d9cA8Af02',
  }, // deploy contracts and make sure they are set up correctly

  sandAdmin: {
    default: 2,
    mainnet: '0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06',
    polygon: '0xfD30a48Bc6c56E24B0ebF1B0117d750e2CFf7531',
    goerli: '0x39D01ecc951C2c1f20ba0549e62212659c4d1e06',
    mumbai: '0x49c4D4C94829B9c44052C5f5Cb164Fc612181165',
  }, // can add super operators and change admin

  operationsAdmin: {
    default: 2,
    mainnet: '0x6ec4090d0F3cB76d9f3D8c4D5BB058A225E560a1',
    polygon: 'sandAdmin',
  },

  upgradeAdmin: 'sandAdmin',

  multiGiveawayAdmin: {
    default: 'sandAdmin',
    mainnet: 'operationsAdmin',
    polygon: 'sandAdmin',
  },

  liquidityRewardProvider: {
    default: 'sandBeneficiary',
    mainnet: '0x8FFA64FB50559c3Ff09a1022b84B2c5233ed8068',
  },
  liquidityRewardAdmin: 'sandAdmin',

  kyberDepositor: {
    default: 'sandBeneficiary',
    mainnet: 'liquidityRewardProvider',
  },

  sandExecutionAdmin: 'sandAdmin', // can add execution extension to SAND (used for Native metatx support)
  mintingFeeCollector: 'sandAdmin', // will receiver the fee from Asset minting
  sandBeneficiary: 'sandAdmin', // will be the owner of all initial SAND
  assetAdmin: 'sandAdmin', // can add super operator and change admin to Asset
  assetMinterAdmin: 'sandAdmin', // can set metaTxProcessors & types
  assetBouncerAdmin: 'sandAdmin', // setup the contract allowed to mint Assets
  sandSaleAdmin: 'sandAdmin', // can pause the sandSale and withdraw SAND
  genesisBouncerAdmin: 'sandAdmin', // can set who is allowed to mint
  defaultMinterAdmin: 'sandAdmin', // can change the fees
  genesisMinter: 'sandAdmin', // the first account allowed to mint genesis Assets
  assetAuctionFeeCollector: 'sandSaleBeneficiary', // collect fees from asset auctions
  assetAuctionAdmin: 'sandAdmin', // can change fee collector

  sandSaleBeneficiary: {
    default: 3,
    mainnet: '0x0EB04462D69B1D267d269377E34f60b9De1c8510',
    polygon: '0xbc4fE9A8a46442eDaF13Bd5c615D7CFe0953885B',
    goerli: '0xF22455c7F2a81E197AecD951F588a9B650f5b282',
    mumbai: '0xa5Eb9C9Eb4F4c35B9Be8cFaAA7909F9ebe6Cb609',
  },

  treasury: {
    default: 'sandSaleBeneficiary',
    mainnet: '0x4489590a116618B506F0EfE885432F6A8ED998E9',
    polygon: '0x1b47567CBE36e63293A7A2018F79687f942aB24C',
  },

  landSaleBeneficiary: {
    default: 'sandSaleBeneficiary',
    mainnet: 'treasury',
    polygon: 'treasury',
  }, // updated to company treasury wallet 9th September - collect funds from land sales

  catalystAssetFeeRecipient: 'treasury',

  landSaleFeeRecipient: {
    default: 3,
    goerli: 5,
    mumbai: 5,
    mainnet: 'sandSaleBeneficiary',
    polygon: '0x42a4a3795446A4c070565da201c6303fC78a2569',
  }, // collect 5% fee from land sales (prior to implementation of FeeDistributor)

  exchangeFeeRecipient: {
    default: '0xc66d094ed928f7840a6b0d373c1cd825c97e3c7c', // TODO: set the correct wallet for the FeeReceiver
    goerli: '0xc66d094ed928f7840a6b0d373c1cd825c97e3c7c', // TODO: set the correct wallet for the FeeReceiver
    mumbai: '0xc66d094ed928f7840a6b0d373c1cd825c97e3c7c', // TODO: set the correct wallet for the FeeReceiver
    mainnet: '0xc66d094ed928f7840a6b0d373c1cd825c97e3c7c', // TODO: set the correct wallet for the FeeReceiver
    polygon: '0xc66d094ed928f7840a6b0d373c1cd825c97e3c7c', // TODO: set the correct wallet for the FeeReceiver
  },

  landAdmin: {
    default: 2,
    mainnet: 'sandAdmin',
    polygon: '0xe75Ce341C98400a45F579e32C95fF49681Fc93fa',
    goerli: 'sandAdmin',
    mumbai: 'sandAdmin',
  }, // can add super operators and change admin

  gemsAndCatalystsAdmin: 'sandAdmin',
  assetAttributesRegistryAdmin: 'sandAdmin',
  proxyAdminOwner: {
    default: 2,
    mainnet: 'sandAdmin',
    polygon: 'landAdmin',
    goerli: 'sandAdmin',
    mumbai: 'sandAdmin',
  },

  landSaleAdmin: 'sandAdmin', // can enable currencies
  gameTokenAdmin: 'sandAdmin', // can set minter address
  gameTokenFeeBeneficiary: 'treasury', // receives fees from GAME token  minting / Mods
  estateAdmin: 'sandAdmin', // can add super operators and change admin
  P2PERC721SaleAdmin: 'sandAdmin', // can set fees
  backendReferralWallet: {
    // default is computed from private key:
    // "0x4242424242424242424242424242424242424242424242424242424242424242"
    default: '0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025',
    mainnet: '0x3044719d139F866a44c988823513eCB93060bF1b',
    polygon: '0x3044719d139F866a44c988823513eCB93060bF1b',
    goerli: '0xB7060D3FeCAC3AE1F0A0AA416E3e8E472257950e',
    mumbai: '0xB7060D3FeCAC3AE1F0A0AA416E3e8E472257950e',
  },
  // To be used with AuthValidator only
  backendAuthWallet: {
    // default is computed from private key:
    // "0x4242424242424242424242424242424242424242424242424242424242424242"
    default: 'backendReferralWallet',
    mainnet: '0x061872DFd0CAC4Ec7a7c87EEE9B950bb1fAD2906',
    goerli: '0x0c72f82B46f034025622731c271bdf06B848Ed77',
    polygon: '0x061872DFd0CAC4Ec7a7c87EEE9B950bb1fAD2906',
    mumbai: '0x0c72f82B46f034025622731c271bdf06B848Ed77',
  },
  backendCashbackWallet: {
    // default is computed from private key:
    // "0x4242424242424242424242424242424242424242424242424242424242424242"
    default: 'backendReferralWallet',
    polygon: '0x564c8aADBd35b6175C0d18595cc335106AA250Dc',
  },
  raffleSignWallet: {
    // default is computed from private key:
    // "0x4242424242424242424242424242424242424242424242424242424242424242"
    default: 'backendReferralWallet',
    mainnet: '0x4e2422AC29B72290Be28C6a7c3Fad7A7fDA69e7a',
    polygon: '0x4e2422AC29B72290Be28C6a7c3Fad7A7fDA69e7a',
  },
  sandboxAccount: {
    default: 4,
    mainnet: '0x7A9fe22691c811ea339D9B73150e6911a5343DcA',
    polygon: '0x7A9fe22691c811ea339D9B73150e6911a5343DcA',
    goerli: '0x5BC3D5A39a50BE2348b9C529f81aE79f00945897', // Leon account on demo.sandbox
  },
  sandboxFoundation: {
    default: 'sandAdmin',
    mainnet: 'liquidityRewardProvider',
    polygon: 'sandboxAccount', //'0xfe66Ec1B46494FE49F53733a098587bf5D12BD88',
  },
  extraCatalystAndGemMinter: {
    default: null,
    mainnet: null,
    goerli: 'sandboxAccount', // Leon account on demo.sandbox
  },
  defaultOperatorFiltererRegistry: '0x000000000000AAeB6D7670E522A718067333cd4E',
  defaultOperatorFiltererSubscription:
    '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6',
  collectionCatalystMigrationsAdmin: 'sandAdmin',
  catalystMinter: 'sandAdmin', // account that can mint catalysts
  catalystAdmin: 'sandAdmin', // can set minter and admin for catatalyt, as well as super operators
  gemAdmin: 'sandAdmin', // can set minter and admin for gems, as well as super operators
  gemMinter: 'sandAdmin', // account that can mint gems
  catalystRegistryAdmin: 'sandAdmin', // can change the minter
  catalystMinterAdmin: 'sandAdmin', // control the fees and which catalyst are allowed
  starterPackAdmin: 'sandAdmin', // can change price
  starterPackSaleBeneficiary: 'treasury', // collect funds from starter pack sales
  backendMessageSigner: 'backendReferralWallet', // account that sign message for the starter pack
  kyberLiquidityProvider: 'sandBeneficiary',
  gemsCatalystsRegistryAdmin: 'sandAdmin',
  ozdRelayer: {
    default: 1,
    mainnet: '0x0073e6eb087019bdb7bede02d23aeb068b74af99',
    polygon: '0x7051cb544c4a8d5aad1be46cc9524e48108e60b4',
    goerli: '0x4751d4dc3d8cff421598592b51bb1d9a0fb116e9',
    mumbai: '0x3c17c97f29182aec3d16a080cda94d6f773bbd91',
  },
  landMigrationBatchExecutor: 'ozdRelayer',
  nftCollectionAdmin: {
    default: 'sandAdmin',
    mainnet: null,
    polygon: '0xF06dD9b61d480704Cc7bEF717e5Ea6efB6Af75bE', // Final admin should be 0xE79AF6BEb7D31c7faF7a1b891d9684960522D22e
  },
};

/**
 * TAGS:
 *  - mainnet -> production networks (you must pay for gas!!!)
 *  - L1      -> Layer 1 networks
 *  - L2      -> Layer 2 networks
 */
const networks = {
  hardhat: {
    tags: ['L1', 'L2'],
    deploy: ['deploy_mocks/', 'deploy/'],
    companionNetworks: {
      l1: 'hardhat',
      l2: 'hardhat',
    },
    blockGasLimit:
      parseInt(process.env.HARDHAT_BLOCK_GAS_LIMIT || '0') || 30000000,
  },
  goerli: {
    tags: ['L1'],
    // gasPrice: 600000000000, // Uncomment in case of pending txs, and adjust gas
    companionNetworks: {
      l2: 'mumbai',
    },
  },
  mainnet: {
    tags: ['mainnet', 'L1'],
    companionNetworks: {
      l2: 'polygon',
    },
  },
  mumbai: {
    tags: ['L2'],
    companionNetworks: {
      l1: 'goerli',
    },
  },
  polygon: {
    tags: ['mainnet', 'L2'],
    companionNetworks: {
      l1: 'mainnet',
    },
  },
};

const compilers = [
  '0.8.21',
  '0.8.19',
  '0.8.18',
  '0.8.15',
  '0.8.2',
  '0.7.5',
  '0.7.6',
  '0.6.5',
  '0.5.9',
].map((version) => ({
  version,
  settings: {
    optimizer: {
      enabled: true,
      runs: 2000,
    },
  },
}));

const config = addForkingSupport({
  importedPackages,
  namedAccounts,
  networks: addNodeAndMnemonic(networks),
  mocha: {
    timeout: 0,
    ...(!process.env.CI ? {} : {invert: true, grep: '@skip-on-ci'}),
  },
  solidity: {
    compilers,
  },
});
export default config;
