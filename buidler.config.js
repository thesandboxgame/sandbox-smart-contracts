require("dotenv").config();
const fs = require("fs");
usePlugin("solidity-coverage");
usePlugin("buidler-deploy");
usePlugin("buidler-ethers-v5");
usePlugin("@nomiclabs/buidler-solhint");
usePlugin("buidler-gas-reporter");

let mnemonic = process.env.MNEMONIC;
if (!mnemonic || mnemonic === "") {
  const mnemonicPath = process.env.MNEMONIC_PATH;
  if (mnemonicPath && mnemonicPath !== "") {
    mnemonic = fs.readFileSync(mnemonicPath).toString();
  }
}
let mainnetMnemonic;
if (mnemonic) {
  mainnetMnemonic = mnemonic;
} else {
  try {
    mnemonic = fs.readFileSync(".mnemonic").toString();
  } catch (e) {}
  try {
    mainnetMnemonic = fs.readFileSync(".mnemonic_mainnet").toString();
  } catch (e) {}
}
const accounts = mnemonic
  ? {
      mnemonic,
    }
  : undefined;
const mainnetAccounts = mainnetMnemonic
  ? {
      mnemonic: mainnetMnemonic,
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
      4: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
      42: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
      314159: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
    }, // deploy contracts and make sure they are set up correctly
    sandAdmin: {
      // can add super operators and change admin
      default: 2,
      // 4: "0x5b4c9eae565c1ba9eb65365aa02ee9fb0a653ce5",
      1: "0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06", // multi sig wallet
      4: "0xE53cd71271AcAdbeb0f64d9c8C62bBdDc8cA9e66",
      42: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
      314159: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
    },
    sandExecutionAdmin: "sandAdmin",
    // metaTransactionFundOwner: 0, // TODO
    // metaTransactionExecutor: 0, // TODO
    mintingFeeCollector: "sandAdmin", // will receiver the fee from Asset minting
    sandBeneficiary: "sandAdmin", // will be the owner of all initial SAND
    assetAdmin: "sandAdmin", // can add super operator and change admin to Asset
    assetBouncerAdmin: "sandAdmin", // setup the contract allowed to mint Assets
    sandSaleAdmin: "sandAdmin", // can pause the sandSale and withdraw SAND
    genesisBouncerAdmin: "sandAdmin", // can set who is allowed to mint
    commonMinterAdmin: "sandAdmin", // can change the fees
    genesisMinter: "deployer", // the first account allowed to mint genesis Assets
    assetAuctionFeeCollector: "sandSaleBeneficiary",
    assetAuctionAdmin: "sandAdmin",
    orbsBeneficiary: "sandSaleBeneficiary",
    sandSaleBeneficiary: {
      default: 3,
      1: "0x9695ed5020BB47880738Db356678fe8cBc8FF60b", // TODO use another wallet ?
      4: "0xcbc70EcCd52bF3910CDC1455E6D2Bd45725F573D",
      42: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
      314159: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
    },
    bundleSandSaleManager: "sandAdmin",
    bundleSandSaleAdmin: "sandAdmin",
    bundleSandSaleBeneficiary: "sandSaleBeneficiary",
    landSaleBeneficiary: "sandSaleBeneficiary",
    landAdmin: {
      default: 2,
      1: "0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06",
      4: "0xE53cd71271AcAdbeb0f64d9c8C62bBdDc8cA9e66",
      42: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
      314159: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
    },
    landSaleAdmin: "sandAdmin",
    estateAdmin: "sandAdmin",
    P2PERC721SaleAdmin: "sandAdmin",
    backendReferralWallet: {
      // default is computed from private key:
      // "0x4242424242424242424242424242424242424242424242424242424242424242"
      default: "0x17c5185167401eD00cF5F5b2fc97D9BBfDb7D025",
      1: "0x3044719d139F866a44c988823513eCB93060bF1b",
      4: "0xB7060D3FeCAC3AE1F0A0AA416E3e8E472257950e",
      42: "0xB7060D3FeCAC3AE1F0A0AA416E3e8E472257950e",
      314159: "0x94AE0495bEDb538F0a14fFE4Dc160dC280989E3a",
    },
    sandboxAccount: {
      default: 4,
      1: "0x7A9fe22691c811ea339D9B73150e6911a5343DcA",
      4: "0x5BC3D5A39a50BE2348b9C529f81aE79f00945897", // Leon asset minter
      42: "0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c",
      314159: "0x9a3b0D0B08fb71F1a5E0F248Ad3a42C341f7837c",
    },
    extraCatalystAndGemMinter: {
      default: null,
      1: null,
      4: "0x5BC3D5A39a50BE2348b9C529f81aE79f00945897", // Leon asset minter
    },
    catalystMinter: "sandAdmin", // TODO later : Staking Reward mechanism
    catalystAdmin: "sandAdmin",
    gemAdmin: "sandAdmin",
    gemMinter: "sandAdmin", // TODO later : Staking Reward mechanism
    catalystRegistryAdmin: "sandAdmin",
    catalystMinterAdmin: "sandAdmin",
    starterPackAdmin: "sandAdmin",
    starterPackSaleBeneficiary: "sandSaleBeneficiary",
    backendMessageSigner: "backendReferralWallet",
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
      accounts,
    },
    test_rinkeby: {
      url: eth_node("rinkeby"),
      accounts,
    },
    mainnet: {
      url: eth_node("mainnet"),
      accounts: mainnetAccounts,
    },
    kovan: {
      url: eth_node("kovan"),
      accounts,
    },
    coverage: {
      url: "http://localhost:5458",
    },
    // wati for : https://github.com/nomiclabs/buidler/pull/522
    // buidlerevm: {
    //   solc: {
    //     version: "0.6.4",
    //     optimizer: {
    //       enabled: false,
    //     },
    //   },
    // },
  },
};
