import {assert} from 'chai';
import {BigNumber, Contract, Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {ethers, getNamedAccounts} from 'hardhat';
import {withSnapshot, waitFor} from '../../../utils';
import {depositViaChildChainManager} from '../../sand/fixtures';

export {assert};

export const raffleSignWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);
export const zeroAddress = '0x0000000000000000000000000000000000000000';

export const setupRaffle = withSnapshot(
  ['RafflePlayboyPartyPeople'],
  async function (hre) {
    const {sandAdmin} = await getNamedAccounts();

    const rafflePlayboyPartyPeopleContract = await ethers.getContract(
      'RafflePlayboyPartyPeople'
    );
    const sandContract = await ethers.getContract('PolygonSand');
    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');

    const SAND_AMOUNT = BigNumber.from(100000).mul('1000000000000000000');

    await depositViaChildChainManager(
      {sand: sandContract, childChainManager},
      sandAdmin,
      SAND_AMOUNT
    );

    return {
      rafflePlayboyPartyPeopleContract,
      sandContract,
      hre,
      getNamedAccounts,
      setupWave,
      signAuthMessageAs,
      transferSand,
      mint: mintSetup(rafflePlayboyPartyPeopleContract, sandContract),
      personalizeSignature: validPersonalizeSignature,
      personalize: personalizeSetup(
        rafflePlayboyPartyPeopleContract,
        validPersonalizeSignature
      ),
      personalizeInvalidSignature: personalizeSetup(
        rafflePlayboyPartyPeopleContract,
        invalidPersonalizeSignature
      ),
    };
  }
);

async function setupWave(
  raffle: Contract,
  waveType: number,
  waveMaxTokens: number,
  waveMaxTokensToBuy: number,
  waveSingleTokenPrice: string,
  contractAddress: string,
  erc1155Id: number
) {
  const {raffleSignWallet} = await getNamedAccounts();

  const owner = await raffle.owner();
  const contract = raffle.connect(ethers.provider.getSigner(owner));

  await contract.setSignAddress(raffleSignWallet);

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
    (await raffle.signAddress()).toString(),
    raffleSignWallet.toString()
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

function validPersonalizeSignature(
  wallet: Wallet | SignerWithAddress,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number,
  tokenId: number,
  personalizationMask: number
) {
  const hashedData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
    [
      address,
      signatureId,
      contractAddress,
      chainId,
      tokenId,
      personalizationMask,
    ]
  );

  return wallet.signMessage(
    ethers.utils.arrayify(ethers.utils.keccak256(hashedData))
  );
}

function invalidPersonalizeSignature(
  wallet: Wallet | SignerWithAddress,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number,
  tokenId: number,
  personalizationMask: number
) {
  const hashedData = ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
    [signatureId, contractAddress, chainId, personalizationMask, tokenId]
  );

  return wallet.signMessage(
    ethers.utils.arrayify(ethers.utils.keccak256(hashedData))
  );
}

function signAuthMessageAs(
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
  const {sandBeneficiary} = await getNamedAccounts();
  const sandContract = await ethers.getContract('PolygonSand');

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

function personalizeSetup(
  raffleContract: Contract,
  signatureFunction: (
    wallet: Wallet | SignerWithAddress,
    address: string,
    signatureId: number,
    contractAddress: string,
    chainId: number,
    tokenId: number,
    personalizationMask: number
  ) => Promise<string>
) {
  return async (
    wallet: Wallet | SignerWithAddress,
    address: string,
    signatureId: number,
    chainId: number,
    tokenId: number,
    personalizationMask: number
  ) => {
    const signature = await signatureFunction(
      wallet,
      address,
      signatureId,
      raffleContract.address,
      chainId,
      tokenId,
      personalizationMask
    );

    const contract = raffleContract.connect(ethers.provider.getSigner(address));

    return waitFor(
      contract.personalize(signatureId, signature, tokenId, personalizationMask)
    );
  };
}
