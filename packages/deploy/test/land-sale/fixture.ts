import {deployments, ethers, getNamedAccounts} from 'hardhat';
import fs from 'fs-extra';
import {SaltedProofSaleLandInfo} from '../../land-sale-artifacts/lib/merkleTreeHelper';
import {Wallet} from 'ethers';
import {withSnapshot} from '../../utils/testUtils';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';

export const backendAuthWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);

const signAuthMessageAs = async (
  wallet: HardhatEthersSigner,
  to: string,
  reserved: string,
  info: (string | number)[],
  salt: string,
  assetIds: number[],
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
  return wallet.signMessage(ethers.getBytes(hashedData));
};

const setupEstateSale = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}, options) => {
    await deployments.fixture();
    const {deployer} = await getNamedAccounts();
    const AuthValidator = await ethers.getContract('PolygonAuthValidator');
    const EstateSaleWithAuth = await ethers.getContract('PolygonLandPreSale_0');

    console.log('AuthValidator', await AuthValidator.getAddress());
    console.log('EstateSaleWithAuth', await EstateSaleWithAuth.getAddress());
  }
);

export {setupEstateSale, signAuthMessageAs};
