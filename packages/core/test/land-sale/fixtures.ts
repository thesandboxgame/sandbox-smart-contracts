import {ethers, getNamedAccounts} from 'hardhat';
import fs from 'fs-extra';
import {SaltedProofSaleLandInfo} from '../../lib/merkleTreeHelper';
import {BigNumber, Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {withSnapshot} from '../utils';
import {originalAssetFixtures} from '../common/fixtures/asset';

export const backendAuthWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);
export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const signAuthMessageAs = async (
  wallet: Wallet | SignerWithAddress,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<string> => {
  const hashedData = ethers.utils.solidityKeccak256(
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
    [
      ...args.slice(0, args.length - 2),
      ethers.utils.solidityKeccak256(
        ['bytes'],
        [ethers.utils.solidityPack(['uint256[]'], [args[args.length - 2]])]
      ),
      ethers.utils.solidityKeccak256(
        ['bytes'],
        [ethers.utils.solidityPack(['bytes32[]'], [args[args.length - 1]])]
      ),
    ]
  );
  return wallet.signMessage(ethers.utils.arrayify(hashedData));
};

export const setupAuthValidator = withSnapshot(
  ['AuthValidator'],
  async function (hre) {
    const authValidatorContract = await ethers.getContract('AuthValidator');
    return {
      authValidatorContract,
      hre,
      getNamedAccounts,
    };
  }
);

export const setupEstateSale = withSnapshot(
  ['EstateSaleWithAuth', 'AssetV1', 'Sand'],
  async function (hre) {
    const authValidatorContract = await ethers.getContract('AuthValidator');
    const estateSaleWithAuthContract = await ethers.getContract(
      'EstateSaleWithAuth_0_0'
    );
    const sandContract = await ethers.getContract('Sand');
    const proofs: SaltedProofSaleLandInfo[] = fs.readJSONSync(
      './secret/estate-sale/hardhat/.proofs_0.json'
    );

    // Set up asset for lands with bundleIds
    const {originalAsset, mintAsset} = await originalAssetFixtures();
    const {deployer} = await getNamedAccounts();
    const tokenId = await mintAsset(deployer, 11);
    await originalAsset[
      'safeTransferFrom(address,address,uint256,uint256,bytes)'
    ](deployer, estateSaleWithAuthContract.address, tokenId, 11, '0x');
    // ---

    await transferSandToDeployer(proofs);
    const approveSandForEstateSale = async (address: string, price: string) => {
      const sandContractAsUser = sandContract.connect(
        ethers.provider.getSigner(address)
      );
      await sandContractAsUser.approve(
        estateSaleWithAuthContract.address,
        price
      );
    };
    return {
      authValidatorContract,
      estateSaleWithAuthContract,
      sandContract,
      approveSandForEstateSale,
      proofs,
      hre,
      getNamedAccounts,
      tokenId,
    };
  }
);

async function transferSandToDeployer(proofs: SaltedProofSaleLandInfo[]) {
  const sandContract = await ethers.getContract('Sand');
  const {deployer, sandBeneficiary, sandboxAccount} = await getNamedAccounts();
  const sandContractAsSandBeneficiary = sandContract.connect(
    ethers.provider.getSigner(sandBeneficiary)
  );
  const sandAmount = BigNumber.from(proofs[2].price); // note: lands with asset bundleId carry premium price
  await sandContractAsSandBeneficiary.transfer(deployer, sandAmount);
  await sandContractAsSandBeneficiary.transfer(sandboxAccount, sandAmount); // reserved address
}
