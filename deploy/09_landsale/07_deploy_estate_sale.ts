import {
  getDeadline,
  getLandSales,
  writeProofs,
  setAsLandMinter,
  LandSale,
} from '../../data/landSales/getLandSales';
import {DeployFunction} from 'hardhat-deploy/types';
import {skipUnlessTest} from '../../utils/network';

const sales = [
  {name: 'EstateSaleWithAuth_0', skip: skipUnlessTest},
  {name: 'LandPreSale_11'},
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

  const sandContract = await deployments.get('Sand');
  const landContract = await deployments.get('Land');
  const assetContract = await deployments.get('PolygonAsset');
  const authValidatorContract = await deployments.get('AuthValidator');

  async function deployLandSale(name: string, landSale: LandSale) {
    const {lands, merkleRootHash, sector} = landSale;

    const landSaleName = `${name}_${sector}`;
    const deadline = getDeadline(hre, sector);

    const args = {
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

    const landSaleDeployment = await deploy(landSaleName, {
      from: deployer,
      linkedData: lands,
      contract: 'EstateSaleWithAuth',
      args: [args],
      skipIfAlreadyDeployed: true,
      log: true,
    });

    writeProofs(hre, landSaleName, landSale);

    await setAsLandMinter(hre, landSaleDeployment.address);
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
    for (const landSale of landSales) {
      await deployLandSale(sale.name, landSale);
    }
  }
};

export default func;
func.tags = ['EstateSaleWithAuth', 'EstateSaleWithAuth_deploy'];
func.dependencies = [
  'Sand_deploy',
  'Land_deploy',
  'PolygonAsset_deploy',
  'AuthValidator_deploy',
];
