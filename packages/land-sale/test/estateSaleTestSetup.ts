import {ethers} from 'hardhat';
import {getLandSales, writeProofs} from './utils/landsale-utils';
import deadlines from '../deadlines';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import fs from 'fs-extra';
import {parseEther} from 'ethers';

export async function runEstateSaleSetup() {
  const [
    _,
    landSaleAdmin,
    landSaleBeneficiary,
    backendReferralWallet,
    landSaleFeeRecipient,
    newLandSaleBeneficiary,
    landBuyer,
    landBuyer2,
    landRecipient,
    trustedForwarder,
  ] = await ethers.getSigners();

  const LandFactory = await ethers.getContractFactory('MockPolygonLand');
  const PolygonLandContract = await LandFactory.deploy();

  const SandFactory = await ethers.getContractFactory('MockPolygonSand');
  const SandContract = await SandFactory.deploy();

  const AssetFactory = await ethers.getContractFactory('MockPolygonAsset');
  const AssetContract = await AssetFactory.deploy();

  const AuthValidatorFactory =
    await ethers.getContractFactory('MockAuthValidator');
  const AuthValidatorContract = await AuthValidatorFactory.deploy(
    landSaleAdmin.address,
    backendReferralWallet.address,
  );

  const landSales = await getLandSales('EstateSaleWithAuth_0', 'hardhat');
  const {merkleRootHash, sector} = landSales[0];
  writeProofs(landSales[0]);

  const deadline = deadlines[sector];

  const reservedLandIndex = 2;

  const EstateSaleFactory =
    await ethers.getContractFactory('EstateSaleWithAuth');

  const EstateSaleContract = await EstateSaleFactory.deploy(
    await PolygonLandContract.getAddress(),
    await SandContract.getAddress(),
    trustedForwarder.address,
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

  const deployEstateSaleContract = async ({
    expiryTime = deadline + 10 * 365 * 24 * 60 * 60,
  } = {}) => {
    return EstateSaleFactory.deploy(
      await PolygonLandContract.getAddress(),
      await SandContract.getAddress(),
      trustedForwarder.address,
      landSaleAdmin.address,
      landSaleBeneficiary.address,
      merkleRootHash,
      expiryTime,
      backendReferralWallet.address,
      2000,
      '0x0000000000000000000000000000000000000000',
      AssetContract.getAddress(),
      landSaleFeeRecipient.address,
      AuthValidatorContract.getAddress(),
    );
  };

  const EstateSaleContractAsAdmin = EstateSaleContract.connect(landSaleAdmin);

  const singleLandSandPrice = parseEther('1011');

  // SAND BALANCE CHANGES
  await SandContract.mint(landBuyer.address, singleLandSandPrice);
  await SandContract.connect(landBuyer).approve(
    await EstateSaleContract.getAddress(),
    singleLandSandPrice,
  );

  await SandContract.mint(landBuyer2.address, singleLandSandPrice);
  await SandContract.connect(landBuyer2).approve(
    await EstateSaleContract.getAddress(),
    singleLandSandPrice,
  );

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

  const proofInfo = fs.readJSONSync(
    './test/data/secret/estate-sale/hardhat/.proofs_0.json',
  );

  const buyLand = async ({
    estateSaleContract = EstateSaleContract,
    from = landBuyer,
    buyer = landBuyer,
    landIndex = 0,
    useWrongSalt = false,
    useWrongProof = false,
  }: {
    estateSaleContract?: typeof EstateSaleContract;
    from?: typeof landBuyer;
    buyer?: typeof landBuyer;
    landIndex?: number;
    useWrongSalt?: boolean;
    useWrongProof?: boolean;
  } = {}) => {
    const {x, y, size, price, salt, proof, assetIds} = proofInfo[landIndex];

    const info = [useWrongProof ? x + 1 : x, y, size, price];

    const signature = await signAuthMessageAs(
      backendReferralWallet,
      buyer.address,
      landIndex === reservedLandIndex ? landBuyer2.address : ethers.ZeroAddress,
      info,
      salt,
      assetIds ?? [],
      proof,
    );

    generateLeaf(info, salt, ethers.ZeroAddress, assetIds);

    return await estateSaleContract.connect(from).buyLandWithSand(
      buyer.address,
      buyer.address,
      landIndex === reservedLandIndex ? landBuyer2.address : ethers.ZeroAddress,
      info,
      useWrongSalt
        ? // FAKED SALT
          '0x21e58be1b520e58018958af3a4b870117c1e0215938022370c5cfe7d42efa771'
        : salt,
      assetIds ?? [],
      proof,
      '0x',
      signature,
    );
  };

  return {
    buyLand,
    deployEstateSaleContract,
    EstateSaleContractAsAdmin,
    EstateSaleContract,
    PolygonLandContract,
    SandContract,
    newLandSaleBeneficiary,
    landSaleAdmin,
    landSaleBeneficiary,
    backendReferralWallet,
    landSaleFeeRecipient,
    landBuyer,
    landBuyer2,
    landRecipient,
    trustedForwarder,
    reservedLandIndex,
    singleLandSandPrice,
    proofInfo,
  };
}
