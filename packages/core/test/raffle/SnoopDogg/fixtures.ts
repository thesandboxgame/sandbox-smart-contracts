import {assert} from 'chai';
import {Contract, Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {ethers, getNamedAccounts} from 'hardhat';
import {withSnapshot, waitFor} from '../../utils';

export {assert};

export const raffleSignWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);
export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const setupRaffle = withSnapshot(['RaffleTheDoggies'], async function (
  hre
) {
  const raffleTheDoggiesContract = await ethers.getContract('RaffleTheDoggies');
  const sandContract = await ethers.getContract('Sand');
  return {
    raffleTheDoggiesContract,
    sandContract,
    hre,
    getNamedAccounts,
    setupWave,
    signAuthMessageAs,
    transferSand,
    mint: mintSetup(raffleTheDoggiesContract, sandContract),
  };
});

async function setupWave(
  raffle: Contract,
  waveType: number,
  waveMaxTokens: number,
  waveMaxTokensToBuy: number,
  waveSingleTokenPrice: string,
  contractAddress: string,
  erc1155Id: number
) {
  const owner = await raffle.owner();
  const contract = raffle.connect(ethers.provider.getSigner(owner));
  await contract.setupWave(
    waveType,
    waveMaxTokens,
    waveMaxTokensToBuy,
    waveSingleTokenPrice,
    contractAddress,
    erc1155Id
  );
  assert.equal((await raffle.waveType()).toString(), waveType.toString());
  assert.equal(
    (await raffle.waveMaxTokens()).toString(),
    waveMaxTokens.toString()
  );
  assert.equal(
    (await raffle.waveMaxTokensToBuy()).toString(),
    waveMaxTokensToBuy.toString()
  );
  assert.equal(
    (await raffle.waveSingleTokenPrice()).toString(),
    waveSingleTokenPrice.toString()
  );
  assert.equal(
    (await raffle.contractAddress()).toString(),
    contractAddress.toString()
  );
  assert.equal((await raffle.erc1155Id()).toString(), erc1155Id.toString());
}

async function signAuthMessageAs(
  wallet: Wallet | SignerWithAddress,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number
) {
  const hashedData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'address', 'uint256'],
    [address, signatureId, contractAddress, chainId]
  );
  return wallet.signMessage(
    ethers.utils.arrayify(ethers.utils.keccak256(hashedData))
  );
}

async function transferSand(address: string, amount: string) {
  const sandContract = await ethers.getContract('Sand');
  const {sandBeneficiary} = await getNamedAccounts();
  const sandContractAsSandBeneficiary = sandContract.connect(
    ethers.provider.getSigner(sandBeneficiary)
  );
  await sandContractAsSandBeneficiary.transfer(address, amount);
}

function mintSetup(raffleContract: Contract, sandContract: Contract) {
  return async (
    wallet: Wallet | SignerWithAddress,
    address: string,
    signatureId: number,
    contractAddress: string,
    chainId: number,
    price: string | number,
    amount: number
  ) => {
    const signature = await signAuthMessageAs(
      wallet,
      address,
      signatureId,
      contractAddress,
      chainId
    );
    const encodedData = raffleContract.interface.encodeFunctionData('mint', [
      address,
      amount,
      signatureId,
      signature,
    ]);
    const contract = sandContract.connect(ethers.provider.getSigner(address));
    return waitFor(
      contract.approveAndCall(raffleContract.address, price, encodedData)
    );
  };
}
