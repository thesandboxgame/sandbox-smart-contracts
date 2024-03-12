import {ethers} from 'hardhat';
import {getLandSales} from '../utils/landsale-utils';
import deadlines from '../deadlines';

export async function runEstateSaleSetup() {
  const [
    deployer,
    landSaleAdmin,
    landSaleBeneficiary,
    backendReferralWallet,
    landSaleFeeRecipient,
  ] = await ethers.getSigners();

  const LandFactory = await ethers.getContractFactory('MockPolygonLand');
  const PolygonLandContract = await LandFactory.deploy();

  const SandFactory = await ethers.getContractFactory('MockPolygonSand');
  const SandContract = await SandFactory.deploy();

  const AssetFactory = await ethers.getContractFactory('MockPolygonAsset');
  const AssetContract = await AssetFactory.deploy();

  const AuthValidatorFactory = await ethers.getContractFactory('AuthValidator');
  const AuthValidatorContract = await AuthValidatorFactory.deploy(
    landSaleAdmin.address,
    backendReferralWallet.address,
  );

  const landSales = await getLandSales('LandPreSale_31', 'hardhat');
  const {merkleRootHash, sector} = landSales[0];

  const deadline = deadlines[sector];

  const EstateSaleFactory =
    await ethers.getContractFactory('EstateSaleWithAuth');
  const EstateSaleContract = await EstateSaleFactory.deploy(
    await PolygonLandContract.getAddress(),
    await SandContract.getAddress(),
    await SandContract.getAddress(),
    landSaleAdmin.address,
    landSaleBeneficiary.address,
    merkleRootHash,
    deadline + 10 * 365 * 24 * 60 * 60,
    backendReferralWallet.address,
    2000,
    '0x0000000000000000000000000000000000000000',
    AssetContract.getAddress(),
    landSaleFeeRecipient.address,
    AuthValidatorContract.getAddress(),
  );

  console.log(await EstateSaleContract.getAddress());

  return {
    PolygonLandContract,
    SandContract,
  };
}
