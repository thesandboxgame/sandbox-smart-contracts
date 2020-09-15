require("dotenv").config();
usePlugin("solidity-coverage");
usePlugin("buidler-deploy");
usePlugin("buidler-ethers-v5");
usePlugin("@nomiclabs/buidler-solhint");
usePlugin("buidler-gas-reporter");

const mnemonic = process.env.MNEMONIC;
const mnemonic_mainnet = process.env.MNEMONIC_MAINNET;
const mnemonic_rinkeby = process.env.MNEMONIC_RINKEBY;
const accounts = mnemonic
  ? {
      mnemonic,
    }
  : undefined;
const accounts_mainnet = mnemonic_mainnet
  ? {
      mnemonic: mnemonic_mainnet,
    }
  : undefined;

const accounts_rinkeby = mnemonic_rinkeby
  ? {
      mnemonic: mnemonic_rinkeby,
    }
  : undefined;

function eth_node(networkName) {
  let uri;
  if (networkName === "mainnet") {
    uri = process.env.ETH_NODE_URI_MAINNET;
    if (uri && uri !== "") {
      return uri;
    }
  }
  uri = process.env.ETH_NODE_URI;
  if (uri) {
    uri = uri.replace("{{networkName}}", networkName);
  }
  if (!uri || uri === "") {
    // throw new Error(`environment variable "ETH_NODE_URI" not configured `);
    return "";
  }
  if (uri.indexOf("{{") >= 0) {
    throw new Error(`invalid uri or network not supported by nod eprovider : ${uri}`);
  }
  return uri;
}

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    src: "src",
  },
  mocha: {
    timeout: 0, // for gas-reporter // TODO create a test plugin that allow to pass mocha args in the command line
  },
  namedAccounts: {
    deployer: {
      default: 1,
      1: "0x18dd4e0eb8699eA4FeE238dE41ECfb95e32272f8",
      rinkeby: "0x8A0e83DE499d7543CF486974a6196a35B5F573E7",
    }, // deploy contracts and make sure they are set up correctly

    sandAdmin: {
      default: 2,
      1: "0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06",
      rinkeby: "0xa4519D601F43D0b8f167842a367465681F652252",
    }, // can add super operators and change admin

    sandExecutionAdmin: "sandAdmin", // can add execution extension to SAND (used for Native metatx support)
    mintingFeeCollector: "sandAdmin", // will receiver the fee from Asset minting
    sandBeneficiary: "sandAdmin", // will be the owner of all initial SAND
    assetAdmin: "sandAdmin", // can add super operator and change admin to Asset
    assetBouncerAdmin: "sandAdmin", // setup the contract allowed to mint Assets
    sandSaleAdmin: "sandAdmin", // can pause the sandSale and withdraw SAND
    genesisBouncerAdmin: "sandAdmin", // can set who is allowed to mint
    commonMinterAdmin: "sandAdmin", // can change the fees
    genesisMinter: "deployer", // the first account allowed to mint genesis Assets
    assetAuctionFeeCollector: "sandSaleBeneficiary", // collect fees from asset auctions
    assetAuctionAdmin: "sandAdmin", // can change fee collector

    sandSaleBeneficiary: {
      default: 3,
      1: "0x9695ed5020BB47880738Db356678fe8cBc8FF60b", // TODO use another wallet ?
      rinkeby: "0x60927eB036621b801491B6c5e9A60A8d2dEeD75A",
    },

    landSaleBeneficiary: {
      default: "sandSaleBeneficiary",
      rinkeby: "sandSaleBeneficiary",
      1: "0x4489590a116618B506F0EfE885432F6A8ED998E9",
    }, // updated to company treasury wallet 9th September - collect funds from land sales

    landSaleFeeRecipient: {default: 3, rinkeby: accounts_rinkeby[5], 1: "0x0EB04462D69B1D267d269377E34f60b9De1c8510"}, // collect 5% fee from land sales (prior to implementation of FeeDistributor)

    landAdmin: {
      default: 2,
      1: "0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06",
      rinkeby: "0xa4519D601F43D0b8f167842a367465681F652252",
    }, // can add super operators and change admin

    landSaleAdmin: "sandAdmin", // can enable currencies
    estateAdmin: "sandAdmin", // can add super operators and change admin
    P2PERC721SaleAdmin: "sandAdmin", // can set fees
    backendReferralWallet: {
      // default is computed from private key:
      // "0x4242424242424242424242424242424242424242424242424242424242424242"
      default: "0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025",
      1: "0x3044719d139F866a44c988823513eCB93060bF1b",
      rinkeby: "0xB7060D3FeCAC3AE1F0A0AA416E3e8E472257950e",
    },
    sandboxAccount: {
      default: 4,
      1: "0x7A9fe22691c811ea339D9B73150e6911a5343DcA",
      rinkeby: "0x5BC3D5A39a50BE2348b9C529f81aE79f00945897", // Leon account on demo.sandbox
    },
    extraCatalystAndGemMinter: {
      default: null,
      1: null,
      rinkeby: "0x5BC3D5A39a50BE2348b9C529f81aE79f00945897", // Leon account on demo.sandbox
    },
    catalystMinter: "sandAdmin", // account that can mint catalysts
    catalystAdmin: "sandAdmin", // can set minter and admin for catatalyt, as well as super operators
    gemAdmin: "sandAdmin", // can set minter and admin for gems, as well as super operators
    gemMinter: "sandAdmin", // account that can mint gems
    catalystRegistryAdmin: "sandAdmin", // can change the minter
    catalystMinterAdmin: "sandAdmin", // control the fees and which catalyst are allowed
    starterPackAdmin: "sandAdmin", // can change price
    starterPackSaleBeneficiary: "sandSaleBeneficiary", // collect funds from starter pack sales
    backendMessageSigner: "backendReferralWallet", // account that sign message for the starter pack
    // testing
    others: {
      default: "from:5",
      deployments: "", // TODO builder-deploy support live
    },
  },
  solc: {
    version: "0.6.5",
    optimizer: {
      enabled: true,
      runs: 2000,
    },
  },
  paths: {
    sources: "src",
  },
  networks: {
    rinkeby: {
      url: eth_node("rinkeby"),
      accounts: accounts_rinkeby,
    },
    rinkeby_test: {
      url: eth_node("rinkeby"),
      accounts,
    },
    mainnet: {
      url: eth_node("mainnet"),
      accounts: accounts_mainnet,
    },
    coverage: {
      url: "http://localhost:5458",
    },
  },
};
