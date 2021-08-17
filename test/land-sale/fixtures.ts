import {ethers, deployments, getNamedAccounts} from 'hardhat';
import fs from 'fs-extra';
import {SaltedProofSaleLandInfo} from '../../lib/merkleTreeHelper';
import {Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';

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
      'uint256[]',
      'bytes32[]',
    ],
    args
  );
  return wallet.signMessage(ethers.utils.arrayify(hashedData));
};

export const setupAuthValidator = deployments.createFixture(async function (
  hre
) {
  await deployments.fixture(['AuthValidator']);
  const authValidatorContract = await ethers.getContract('AuthValidator');
  return {
    authValidatorContract,
    hre,
    getNamedAccounts,
  };
});

export const setupEstateSale = deployments.createFixture(async function (hre) {
  await deployments.fixture(['EstateSaleWithAuth']);
  const authValidatorContract = await ethers.getContract('AuthValidator');
  const estateSaleWithAuthContract = await ethers.getContract(
    'EstateSaleWithAuth_0_0'
  );
  const sandContract = await ethers.getContract('Sand');
  const proofs: SaltedProofSaleLandInfo[] = fs.readJSONSync(
    './secret/estate-sale/hardhat/.proofs_EstateSaleWithAuth_0_0.json'
  );
  await transferSandToDeployer(proofs);
  const approveSandForEstateSale = async (address: string, price: string) => {
    const sandContractAsUser = await sandContract.connect(
      ethers.provider.getSigner(address)
    );
    await sandContractAsUser.approve(estateSaleWithAuthContract.address, price);
  };
  return {
    authValidatorContract,
    estateSaleWithAuthContract,
    approveSandForEstateSale,
    proofs,
    hre,
    getNamedAccounts,
  };
});

async function transferSandToDeployer(proofs: SaltedProofSaleLandInfo[]) {
  const sandContract = await ethers.getContract('Sand');
  const {deployer, sandBeneficiary} = await getNamedAccounts();
  const sandContractAsSandBeneficiary = await sandContract.connect(
    ethers.provider.getSigner(sandBeneficiary)
  );
  await sandContractAsSandBeneficiary.transfer(deployer, proofs[0].price);
}
