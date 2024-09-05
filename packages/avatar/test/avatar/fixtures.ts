import {ethers} from 'hardhat';
import {Wallet, parseUnits, keccak256, AbiCoder, toUtf8Bytes} from 'ethers';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import {setBalance} from '@nomicfoundation/hardhat-network-helpers';

export async function deployFakeSandContract(
  sandAdminWallet: Wallet | HardhatEthersSigner,
  mintToDeployerAmount: bigint
) {
  const PolygonSand = await ethers.getContractFactory('MockERC20');
  const polygonSandContract = await PolygonSand.connect(sandAdminWallet).deploy(
    mintToDeployerAmount
  );
  const sandContractAsOwner = polygonSandContract.connect(sandAdminWallet);

  return {
    polygonSandContract,
    sandContractAsOwner,
  };
}

export const setupMockERC20 = async () => {
  const {deployer} = await getTestingAccounts();
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  return await MockERC20.connect(deployer).deploy(100_000_000n);
};

export async function topUpAddressWithETH(
  recipientAddress: string,
  nativeTokenAmount: number
): Promise<void> {
  const amountToSend = parseUnits(nativeTokenAmount.toString(), 'ether');
  await setBalance(recipientAddress, amountToSend);
}

export async function getTestingAccounts() {
  const [
    deployer,
    randomWallet,
    randomWallet2,
    treasury,
    raffleSignWallet,
    nftCollectionAdmin,
    sandAdmin,
    sandBeneficiary,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    trustedForwarder,
  ] = await ethers.getSigners();
  return {
    deployer,
    randomWallet,
    randomWallet2,
    treasury,
    raffleSignWallet,
    nftCollectionAdmin,
    sandAdmin,
    sandBeneficiary,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    trustedForwarder,
  };
}

export function getStorageSlotJS(key: string): string {
  return (
    '0x' +
    (
      BigInt(
        keccak256(
          AbiCoder.defaultAbiCoder().encode(
            ['uint256'],
            [BigInt(keccak256(toUtf8Bytes(key))) - 1n]
          )
        )
      ) & ~0xffn
    ).toString(16)
  );
}
