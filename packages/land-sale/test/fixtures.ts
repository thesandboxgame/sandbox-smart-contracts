import {ethers, getNamedAccounts} from 'hardhat';
import fs from 'fs-extra';
import {SaltedProofSaleLandInfo} from '../../lib/merkleTreeHelper';
import {Wallet} from 'ethers';

export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const signAuthMessageAs = async (
  wallet: Wallet,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Promise<string> => {
  const hashedData = ethers.solidityPackedKeccak256(
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
      ethers.solidityPackedKeccak256(
        ['bytes'],
        [ethers.solidityPacked(['uint256[]'], [args[args.length - 2]])],
      ),
      ethers.solidityPackedKeccak256(
        ['bytes'],
        [ethers.solidityPacked(['bytes32[]'], [args[args.length - 1]])],
      ),
    ],
  );
  return wallet.signMessage(ethers.getBytes(hashedData));
};

export const setupAuthValidator = async () => {
  const signerWallet = new ethers.Wallet(
    '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0',
  );
  const {sandAdmin} = await getNamedAccounts();
  const AuthValidatorFactory = await ethers.getContractFactory('AuthValidator');
  const AuthValidatorContract = await AuthValidatorFactory.deploy(
    sandAdmin,
    signerWallet.address,
  );

  return {AuthValidatorContract, backendAuthWallet: signerWallet};
};

export const setupSandContract = async () => {
  const SandFactory = await ethers.getContractFactory('Sand');
  const SandContract = await SandFactory.deploy();
  return SandContract;
};

const setupEstateSaleContract = async () => {
  const authValidatorContract = await setupAuthValidator();
  const EstateSaleFactory =
    await ethers.getContractFactory('EstateSaleWithAuth');
  const EstateSaleContract = await EstateSaleFactory.deploy(
    authValidatorContract.address,
  );

  return EstateSaleContract;
};

export const setupEstateSale = async function () {
  const sandContract = await setupSandContract();
  const proofs: SaltedProofSaleLandInfo[] = fs.readJSONSync(
    './secret/estate-sale/hardhat/.proofs_0.json',
  );
  await transferSandToDeployer(proofs);
  const approveSandForEstateSale = async (address: string, price: string) => {
    const sandContractAsUser = sandContract.connect(
      await ethers.provider.getSigner(address),
    );
    await sandContractAsUser.approve(estateSaleWithAuthContract.address, price);
  };
  return {
    authValidatorContract,
    estateSaleWithAuthContract,
    sandContract,
    approveSandForEstateSale,
    proofs,
    hre,
    getNamedAccounts,
  };
};

async function transferSandToDeployer(proofs: SaltedProofSaleLandInfo[]) {
  const sandContract = await ethers.getContract('Sand');
  const {deployer, sandBeneficiary} = await getNamedAccounts();
  const sandContractAsSandBeneficiary = sandContract.connect(
    ethers.provider.getSigner(sandBeneficiary),
  );
  await sandContractAsSandBeneficiary.transfer(deployer, proofs[0].price);
}
