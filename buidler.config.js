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

module.exports = {
  gasReporter: {
    enabled: process.env.REPORT_GAS ? true : false,
    src: "src",
  },
  namedAccounts: {
    deployer: {
      default: 1,
      1: "0x18dd4e0eb8699eA4FeE238dE41ECfb95e32272f8",
      4: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
      314159: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
    }, // deploy contracts and make sure they are set up correctly
    sandAdmin: {
      // can add super operators and change admin
      default: 2,
      // 4: "0x5b4c9eae565c1ba9eb65365aa02ee9fb0a653ce5",
      1: "0xeaa0993e1d21c2103e4f172a20d29371fbaf6d06", // multi sig wallet
      4: "0xcbc70EcCd52bF3910CDC1455E6D2Bd45725F573D", // test multi sig wallet
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
      314159: "0x61c461EcC993aaDEB7e4b47E96d1B8cC37314B20",
    },
    bundleSandSaleManager: "sandAdmin",
    bundleSandSaleAdmin: "sandAdmin",
    bundleSandSaleBeneficiary: "sandSaleBeneficiary",
    landSaleBeneficiary: "sandSaleBeneficiary",
    landAdmin: "sandAdmin",
    landSaleAdmin: "sandAdmin",
    estateAdmin: "sandAdmin",
    P2PERC721SaleAdmin: "sandAdmin",
    backendReferralWallet: {
      default: 0,
      1: "0x3044719d139F866a44c988823513eCB93060bF1b",
      4: "0xB7060D3FeCAC3AE1F0A0AA416E3e8E472257950e",
      314159: "0x94AE0495bEDb538F0a14fFE4Dc160dC280989E3a",
    },
    catalystMinter: "sandAdmin", // TODO ?
    catalystAdmin: "sandAdmin",
    gemCoreAdmin: "sandAdmin",
    gemCoreMinter: "sandAdmin", // TODO ?
    catalystRegistryAdmin: "sandAdmin",
    catalystMinterAdmin: "sandAdmin",
    // testing
    others: {
      default: "from:5",
      deployments: "", // TODO live
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
      url: "https://rinkeby.infura.io/v3/ced8eecc03984939b556332468325813",
      accounts,
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/ced8eecc03984939b556332468325813",
      accounts: mainnetAccounts,
    },
    coverage: {
      url: "http://localhost:5458",
      accounts: accounts,
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
