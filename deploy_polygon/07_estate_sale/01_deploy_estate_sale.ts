import {
  getDeadline,
  getLandSales,
  writeProofs,
  setAsLandMinter,
  LandSale,
} from '../../data/landSales/getLandSales';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {readJSONSync, removeSync, writeJSONSync} from 'fs-extra';

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
  {name: 'EstateSaleWithAuth_0', skip: skipUnlessTest},
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

  const sandContract = await deployments.get('PolygonSand');
  const landContract = await deployments.get('PolygonLand');
  const assetContract = await deployments.get('PolygonAsset');
  const authValidatorContract = await deployments.get('PolygonAuthValidator');

  async function deployLandSale(name: string, landSale: LandSale) {
    const {lands, merkleRootHash, sector} = landSale;

    const landSaleName = `${name}_${sector}`;
    const deadline = getDeadline(hre, sector);

    const deployArgs = {
      asset: assetContract.address,
      landAddress: landContract.address,
      sandContractAddress: sandContract.address,
      admin: landSaleAdmin,
      estate: '0x0000000000000000000000000000000000000000',
      feeDistributor: landSaleFeeRecipient,
      initialWalletAddress: landSaleBeneficiary,
      authValidator: authValidatorContract.address,
      expiryTime: deadline,
      merkleRoot: merkleRootHash,
      trustedForwarder: sandContract.address,
      initialSigningWallet: backendReferralWallet,
      initialMaxCommissionRate: 2000,
    };

    const newDeployment = await deployments.getOrNull(`LandPreSale_${sector}`);
    if (newDeployment) return;
    const landSaleDeployment = await deploy(landSaleName, {
      from: deployer,
      linkedData: lands,
      contract: 'EstateSaleWithAuth',
      args: [deployArgs],
      skipIfAlreadyDeployed: true,
      log: true,
    });
    checkAndUpdateExistingDeployments(hre.network.name, sector, landSaleName);

    writeProofs(hre, landSaleName, landSale);

    const args = landSaleDeployment.args || [];
    const landName = args.some(
      (item) => item.landAddress === landContract.address
    )
      ? 'PolygonLand'
      : 'PolygonLand_Old';
    await setAsLandMinter(hre, landSaleDeployment.address, landName);
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

function checkAndUpdateExistingDeployments(
  networkName: string,
  sector: number,
  oldCompleteName: string
) {
  const oldPath = `./deployments/${networkName}/${oldCompleteName}.json`;
  const oldExists = readJSONSync(oldPath, {throws: false});
  if (oldExists) {
    const newPath = `./deployments/${networkName}/LandPreSale_${sector}.json`;
    const newExists = readJSONSync(newPath, {throws: false});
    if (!newExists) writeJSONSync(newPath, oldExists, {spaces: 2});
    removeSync(oldPath);
  }
}

export default func;
func.tags = ['PolygonEstateSaleWithAuth', 'PolygonEstateSaleWithAuth_deploy'];
func.dependencies = [
  'PolygonSand_deploy',
  'PolygonLand_deploy',
  'PolygonAsset_deploy',
  'PolygonAuthValidator_deploy',
];
