import {assert} from 'chai';
import {HardhatEthersSigner} from '@nomicfoundation/hardhat-ethers/signers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {ethers, network} from 'hardhat';
import {Wallet, ZeroAddress, parseUnits} from 'ethers';
import {GenericRaffle} from '../../../typechain-types/contracts/raffleold/contracts/GenericRaffle';
import {
  getTestingAccounts,
  topUpAddressWithETH,
  deployFakeSandContract,
} from '../fixtures';
import {setupRaffleContract} from '../raffleSetup';
import {MockERC20} from '../../../typechain-types';

export const preSetupAvatar = async (
  contractName: string,
  collectionMaxSupply: number,
  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  initializationArgs: Array<any>
) => {
  const {
    collectionContract,
    collectionOwner,
    collectionContractAsOwner,
    randomWallet,
    collectionContractAsRandomWallet,
  } = await setupRaffleContract(
    contractName,
    collectionMaxSupply,
    initializationArgs
  );
  const {sandAdmin} = await getTestingAccounts();
  const mintToDeployerAmount = parseUnits('100000000', 'ether');
  const {polygonSandContract, sandContractAsOwner} =
    await deployFakeSandContract(sandAdmin, mintToDeployerAmount);

  await collectionContractAsOwner.setAllowedExecuteMint(
    await polygonSandContract.getAddress()
  );
  await topUpAddressWithETH(await sandContractAsOwner.owner(), 1000);

  return {
    network,
    collectionContract,
    collectionOwner,
    collectionContractAsOwner,
    randomWallet,
    collectionContractAsRandomWallet,
    sandContract: polygonSandContract,
    setupWave: await createSetupWave(collectionContractAsOwner),
    signAuthMessageAs,
    transferSand: await setupTransferSand(sandContractAsOwner),
    mint: mintSetup(collectionContract, polygonSandContract),
    personalizeSignature: validPersonalizeSignature,
    personalize: personalizeSetup(
      collectionContract,
      validPersonalizeSignature
    ),
    personalizeInvalidSignature: personalizeSetup(
      collectionContract,
      invalidPersonalizeSignature
    ),
  };
};

async function createSetupWave(contract: GenericRaffle) {
  return async (
    waveMaxTokens: number,
    waveMaxTokensToBuy: number,
    waveSingleTokenPrice: string
  ) => {
    const {raffleSignWallet} = await getTestingAccounts();

    await contract.setSignAddress(raffleSignWallet.address);

    const waveType = 0;
    const contractAddress = ZeroAddress;
    const erc1155Id = 0;

    await contract.setupWave(
      waveType,
      waveMaxTokens,
      waveMaxTokensToBuy,
      waveSingleTokenPrice,
      contractAddress,
      erc1155Id
    );
    assert.equal((await contract.waveType()).toString(), waveType.toString());
    assert.equal(
      (await contract.waveMaxTokens()).toString(),
      waveMaxTokens.toString()
    );
    assert.equal(
      (await contract.signAddress()).toString(),
      raffleSignWallet.address.toString()
    );
    assert.equal(
      (await contract.waveMaxTokensToBuy()).toString(),
      waveMaxTokensToBuy.toString()
    );
    assert.equal(
      (await contract.waveSingleTokenPrice()).toString(),
      waveSingleTokenPrice.toString()
    );
    assert.equal(
      (await contract.contractAddress()).toString(),
      contractAddress.toString()
    );
    assert.equal((await contract.erc1155Id()).toString(), erc1155Id.toString());
  };
}

export type AvatarMintingSetup = {
  collectionContract: GenericRaffle;
  mintedIdx: string[];
  minterAddress: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

function validPersonalizeSignature(
  wallet: Wallet | SignerWithAddress | HardhatEthersSigner,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number,
  tokenId: number | string,
  personalizationMask: number
) {
  // https://gist.github.com/mqklin/2999a7b222e9af4f2bf67c7df3b2869e#file-sanr-ethers-v5-v6-migration
  const hashedData = ethers.AbiCoder.defaultAbiCoder().encode(
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

  return wallet.signMessage(ethers.getBytes(ethers.keccak256(hashedData)));
}

function invalidPersonalizeSignature(
  wallet: Wallet | SignerWithAddress | HardhatEthersSigner,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number,
  tokenId: number | string,
  personalizationMask: number
) {
  const hashedData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
    [signatureId, contractAddress, chainId, personalizationMask, tokenId]
  );

  return wallet.signMessage(ethers.getBytes(ethers.keccak256(hashedData)));
}

function signAuthMessageAs(
  wallet: Wallet | SignerWithAddress | HardhatEthersSigner,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number
) {
  // const hashedData = ethers.utils.defaultAbiCoder.encode(
  const hashedData = ethers.AbiCoder.defaultAbiCoder().encode(
    ['address', 'uint256', 'address', 'uint256'],
    [address, signatureId, contractAddress, chainId]
  );
  // https://docs.ethers.org/v6/migrating/
  return wallet.signMessage(ethers.getBytes(ethers.keccak256(hashedData)));
}

async function setupTransferSand(sandContractAsOwner: MockERC20) {
  return async (address: string, amount: string) => {
    const amountToSend = parseUnits(amount.toString(), 'ether');
    await sandContractAsOwner.donateTo(address, amountToSend);
  };
}

function mintSetup(collectionContract: GenericRaffle, sandContract: MockERC20) {
  return async (
    wallet: Wallet | SignerWithAddress | HardhatEthersSigner,
    address: string,
    signatureId: number,
    contractAddress: string,
    chainId: number,
    approvalAmount: string | number,
    amount: number
  ) => {
    const signature = await signAuthMessageAs(
      wallet,
      address,
      signatureId,
      contractAddress,
      chainId
    );
    const encodedData = collectionContract.interface.encodeFunctionData(
      'mint',
      [address, amount, signatureId, signature]
    );
    const contract = sandContract.connect(
      await ethers.provider.getSigner(address)
    );
    const mintTx = await contract.approveAndCall(
      await collectionContract.getAddress(),
      approvalAmount,
      encodedData
    );
    await mintTx.wait();
    return mintTx;
  };
}

function personalizeSetup(
  collectionContract: GenericRaffle,
  signatureFunction: (
    wallet: Wallet | SignerWithAddress | HardhatEthersSigner,
    address: string,
    signatureId: number,
    contractAddress: string,
    chainId: number,
    tokenId: number | string,
    personalizationMask: number
  ) => Promise<string>
) {
  return async (
    wallet: Wallet | SignerWithAddress | HardhatEthersSigner,
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
      await collectionContract.getAddress(),
      chainId,
      tokenId,
      personalizationMask
    );

    const contract = collectionContract.connect(
      await ethers.provider.getSigner(address)
    );

    return await contract.personalize(
      signatureId,
      signature,
      tokenId,
      personalizationMask
    );
  };
}
