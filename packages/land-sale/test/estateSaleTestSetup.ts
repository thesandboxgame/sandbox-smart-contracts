import {ethers} from 'hardhat';
import {getLandSales, writeProofs} from './utils/landsale-utils';
import deadlines from '../deadlines';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import fs from 'fs-extra';

export async function runEstateSaleSetup() {
  const [
    _,
    landSaleAdmin,
    landSaleBeneficiary,
    backendReferralWallet,
    landSaleFeeRecipient,
    newLandSaleBeneficiary,
    landBuyer,
    landRecipient,
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

  const landSales = await getLandSales('EstateSaleWithAuth_0', 'hardhat');
  const {merkleRootHash, sector} = landSales[0];
  writeProofs(landSales[0]);

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

  const EstateSaleContractAsAdmin = EstateSaleContract.connect(landSaleAdmin);

  const signAuthMessageAs = async (
    wallet: HardhatEthersSigner,
    to: string,
    reserved: string,
    info: (string | number)[],
    salt: string,
    assetIds: number[],
    proof: string[],
  ): Promise<string> => {
    const hashedAssetIds = ethers.keccak256(
      ethers.solidityPacked(['uint256[]'], [assetIds]),
    );
    const hashedProof = ethers.keccak256(
      ethers.solidityPacked(['bytes32[]'], [proof]),
    );

    const encoded = ethers.solidityPacked(
      [
        'address',
        'address',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes32',
        'bytes32',
        'bytes32',
      ],
      [to, reserved, ...info, salt, hashedAssetIds, hashedProof],
    );
    const hashedData = ethers.keccak256(encoded);
    return wallet.signMessage(ethers.getBytes(hashedData));
  };

  const generateLeaf = (
    info: (string | number)[],
    salt: string,
    reserved: string,
    assetIds: any[],
  ) => {
    const leaf = ethers.keccak256(
      ethers.solidityPacked(
        [
          'uint256',
          'uint256',
          'uint256',
          'uint256',
          'address',
          'bytes32',
          'uint256[]',
        ],
        [...info, reserved, salt, assetIds],
      ),
    );
  };

  const buyLand = async () => {
    const proofInfo = fs.readJSONSync(
      './test/data/secret/estate-sale/hardhat/.proofs_0.json',
    );

    const {x, y, size, price, salt, proof, assetIds} = proofInfo[0];
    const info = [x, y, size, price];

    const signature = await signAuthMessageAs(
      backendReferralWallet,
      landRecipient.address,
      ethers.ZeroAddress,
      info,
      salt,
      assetIds ?? [],
      proof,
    );

    generateLeaf(info, salt, ethers.ZeroAddress, assetIds);

    await EstateSaleContract.connect(landBuyer).buyLandWithSand(
      landBuyer.address,
      landRecipient.address,
      ethers.ZeroAddress,
      info,
      salt,
      assetIds ?? [],
      proof,
      '0x',
      signature,
    );
  };

  return {
    buyLand,
    EstateSaleContractAsAdmin,
    EstateSaleContract,
    PolygonLandContract,
    SandContract,
    newLandSaleBeneficiary,
  };
}
