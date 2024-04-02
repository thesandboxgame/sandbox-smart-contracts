import {AuthValidator} from './../../../land-sale/typechain-types/contracts/AuthValidator';
import {EstateSaleWithAuth} from './../../../land-sale/typechain-types/contracts/EstateSaleWithAuth';
import {deployments, ethers, getNamedAccounts, network} from 'hardhat';
import fs from 'fs-extra';
import {SaltedProofSaleLandInfo} from '../../land-sale-artifacts/lib/merkleTreeHelper';
import {AbiCoder, Wallet, parseEther} from 'ethers';
import {withSnapshot} from '../../utils/testUtils';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import proofs from '../../land-sale-artifacts/secret/estate-sale/hardhat/.proofs_0.json';

const backendAuthWallet = new Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);

const signAuthMessageAs = async (
  to: string,
  reserved: string,
  info: (string | number)[],
  salt: string,
  assetIds: string[],
  proof: string[]
): Promise<string> => {
  const hashedAssetIds = ethers.keccak256(
    ethers.solidityPacked(['uint256[]'], [assetIds])
  );
  const hashedProof = ethers.keccak256(
    ethers.solidityPacked(['bytes32[]'], [proof])
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
    [to, reserved, ...info, salt, hashedAssetIds, hashedProof]
  );
  const hashedData = ethers.keccak256(encoded);
  return backendAuthWallet.signMessage(ethers.getBytes(hashedData));
};

export const setupEstateSale = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}, options) => {
    await deployments.fixture();
    const {deployer, sandBeneficiary, assetAdmin} = await getNamedAccounts();
    const AuthValidator = await ethers.getContract('PolygonAuthValidator');
    const EstateSaleWithAuth = await ethers.getContract('PolygonLandPreSale_0');
    const PolygonSand = await ethers.getContract('PolygonSand');
    const Asset = await ethers.getContract('Asset');
    const ChildChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');

    const FUNDS_AMOUNT = parseEther('10000'); // arbitrary amount to beneficiary
    const abiCoder = new AbiCoder();
    const data = abiCoder.encode(['uint256'], [FUNDS_AMOUNT]);

    await ChildChainManager.callSandDeposit(
      await PolygonSand.getAddress(),
      deployer,
      data
    );

    await ChildChainManager.callSandDeposit(
      await PolygonSand.getAddress(),
      sandBeneficiary,
      data
    );

    // mint asset for testing
    const assetSigner = await ethers.getSigner(assetAdmin);
    await Asset.connect(assetSigner).grantRole(
      await Asset.MINTER_ROLE(),
      assetAdmin
    );

    await Asset.connect(assetSigner).mint(
      await EstateSaleWithAuth.getAddress(),
      proofs[1].assetIds[0],
      10,
      'hash1'
    );
    await Asset.connect(assetSigner).mint(
      await EstateSaleWithAuth.getAddress(),
      proofs[1].assetIds[1],
      10,
      'hash2'
    );

    const approveSandForEstateSale = async (wallet: string, amount: string) => {
      const tx = await PolygonSand.connect(
        await ethers.provider.getSigner(wallet)
      ).approve(EstateSaleWithAuth.getAddress(), amount);
      await tx.wait();
    };

    return {
      EstateSaleWithAuth,
      AuthValidator,
      sandBeneficiary,
      backendAuthWallet,
      PolygonSand,
      deployer,
      proofs,
      signAuthMessageAs,
      approveSandForEstateSale,
    };
  }
);
