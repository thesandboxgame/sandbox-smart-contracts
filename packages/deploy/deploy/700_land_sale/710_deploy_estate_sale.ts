import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {
  getDeadline,
  getLandSales,
  LandSale,
  setAsLandMinter,
  writeProofs,
} from '../../land-sale-artifacts/landsale-utils';

type SaleDeployment = {
  name: string;
  // top level skip function for the whole sale data
  skip?: (env: HardhatRuntimeEnvironment) => Promise<boolean>;
  // object map of skip function for each individual sector
  skipSector?: {
    [sector: number]: (env: HardhatRuntimeEnvironment) => Promise<boolean>;
  };
};

const sales: SaleDeployment[] = [
  {
    name: 'LandPreSale_Test',
    skip: async (hre: HardhatRuntimeEnvironment) => {
      return hre.network.name !== 'hardhat';
    },
  },
  {name: 'LandPreSale_19', skip: async () => true},
  {name: 'LandPreSale_20', skip: async () => true},
  {name: 'LandPreSale_21', skip: async () => true},
  {name: 'LandPreSale_22', skip: async () => true},
  {name: 'LandPreSale_23', skip: async () => true},
  {name: 'LandPreSale_24', skip: async () => true},
  {name: 'LandPreSale_25', skip: async () => true},
  {name: 'LandPreSale_26', skip: async () => true},
  {name: 'LandPreSale_27', skip: async () => true},
  {name: 'LandPreSale_28', skip: async () => true},
  {name: 'LandPreSale_29', skip: async () => true},
  {name: 'LandPreSale_30', skip: async () => true},
  {name: 'LandPreSale_31', skip: async () => true},
];

const func: DeployFunction = async function (hre) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    landSaleBeneficiary,
    backendReferralWallet,
    landSaleFeeRecipient,
    landSaleAdmin,
  } = await getNamedAccounts();

  const landContract = await deployments.get('PolygonLand');
  const sandContract = await deployments.get('PolygonSand');
  const assetContract = await deployments.get('Asset');
  const authValidator = await deployments.get('PolygonAuthValidator');

  async function deployLandSale(name: string, landSale: LandSale) {
    const {lands, merkleRootHash, sector} = landSale;
    const landSaleName = `${name}_${sector}`;
    const deadline = getDeadline(hre, sector);
    const deployName = `PolygonLandPreSale_${sector}`;
    let landSaleDeployment = await deployments.getOrNull(deployName);
    if (!landSaleDeployment) {
      landSaleDeployment = await deploy(deployName, {
        from: deployer,
        linkedData: lands,
        contract:
          '@sandbox-smart-contracts/land-sale/contracts/EstateSaleWithAuth.sol:EstateSaleWithAuth',
        args: [
          landContract.address,
          sandContract.address,
          sandContract.address,
          landSaleAdmin,
          landSaleBeneficiary,
          merkleRootHash,
          deadline,
          backendReferralWallet,
          2000,
          '0x0000000000000000000000000000000000000000',
          assetContract.address,
          landSaleFeeRecipient,
          authValidator.address,
        ],
        log: true,
      });
      writeProofs(hre, landSaleName, landSale);
    }
    await setAsLandMinter(hre, landSaleDeployment.address, 'PolygonLand');
  }

  for (const sale of sales) {
    if (sale.skip) {
      const skip = await sale.skip(hre);
      if (skip) continue;
    }
    const landSales = await getLandSales(
      sale.name,
      hre.network.name,
      hre.network.live
    );
    const skipSector = sale.skipSector || {};
    const sectors = Object.keys(skipSector).map((k) => parseInt(k));
    for (const landSale of landSales) {
      if (sectors.includes(landSale.sector)) {
        const skip = await skipSector[landSale.sector](hre);
        if (skip) {
          console.log(`Skipping sector ${landSale.sector}`);
          continue;
        }
      }
      await deployLandSale(sale.name, landSale);
    }
  }
};

export default func;
func.tags = ['PolygonEstateSaleWithAuth', 'PolygonEstateSaleWithAuth_deploy'];
func.dependencies = [
  'Asset',
  'PolygonSand_deploy',
  'PolygonLand_deploy',
  'PolygonAuthValidator_deploy',
];