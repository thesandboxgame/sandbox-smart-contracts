import {ethers} from 'hardhat';
import {Wallet, parseUnits} from 'ethers';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import {setBalance} from '@nomicfoundation/hardhat-network-helpers';

export async function deployFakeSandContract(
  sandAdminWallet: Wallet | HardhatEthersSigner,
  mintToDeployerAmount: bigint
) {
  const PolygonSand = await ethers.getContractFactory('FakePolygonSand');
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
  const ERC20PresetMinterPauser = await ethers.getContractFactory('MockERC20');
  return await ERC20PresetMinterPauser.connect(deployer).deploy(
    'RToken',
    'RAND',
    100_000_000n
  );
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
