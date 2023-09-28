import {assert} from 'chai';
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {ethers, network} from 'hardhat';
import {Wallet, parseUnits} from 'ethers';
import { AvatarCollection } from '../../../typechain-types/contracts/avatar/AvatarCollection';
import { FakePolygonSand, PolygonSand } from '../../../typechain-types';
import { getTestingAccounts, topUpAddressWithETH } from '../fixtures';
import { setupAvatarCollectionContract } from '../collectionSetup';


export const collectionName = 'MockAvatarTesting';
export const COLLECTION_MAX_SUPPLY = 500;

export const setupAvatar = async () => {

    const {
      polygonSandContract,
      sandContractAsOwner,
      collectionFactoryContract,
      collectionFactoryAsOwner,
      factoryOwner,
      collectionContract,
      collectionOwner,    
      collectionContractAsOwner,
      randomWallet,
      collectionContractAsRandomWallet
    } = await setupAvatarCollectionContract();
  
    await topUpAddressWithETH(await sandContractAsOwner.owner(), 1000);

    return {
      network,
      collectionFactoryContract,
      collectionFactoryAsOwner,
      factoryOwner,
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
}

async function createSetupWave(contract: AvatarCollection) {
  return async (  waveMaxTokens: number,
    waveMaxTokensToBuy: number,
    waveSingleTokenPrice: string
  ) => {
    const {raffleSignWallet} = await getTestingAccounts();

    await contract.setSignAddress(raffleSignWallet);
  
    await contract.setupWave(
      waveMaxTokens,
      waveMaxTokensToBuy,
      waveSingleTokenPrice
    );
    assert.equal(
      (await contract.waveMaxTokensOverall()).toString(),
      waveMaxTokens.toString()
    );
    assert.equal(
      (await contract.signAddress()).toString(),
      raffleSignWallet.address
    );
    assert.equal(
      (await contract.waveMaxTokensPerWallet()).toString(),
      waveMaxTokensToBuy.toString()
    );
    assert.equal(
      (await contract.waveSingleTokenPrice()).toString(),
      waveSingleTokenPrice.toString()
    );
  };
}

export type AvatarMintingSetup = {
  collectionContract: AvatarCollection;
  mintedIdx: string[];
  minterAddress: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

export async function setupAvatarAndMint(
  mintCount: number
): Promise<AvatarMintingSetup> {
  const avatarSetup = await setupAvatar();

  const {
    collectionContract,
    network,
    transferSand,
    setupWave,
    mint,
  } = avatarSetup;
  const {deployer, raffleSignWallet} = await getTestingAccounts();
  await transferSand(deployer.address, '1000');
  await setupWave(mintCount * 2, mintCount, '1');

  await mint(
    raffleSignWallet,
    deployer.address,
    0,
    await collectionContract.getAddress(),
    network.config.chainId || 31337,
    mintCount.toString(),
    mintCount
  );

  const transferEvents = await collectionContract.queryFilter(
    collectionContract.filters.Transfer()
  );

  const mintedIdx: string[] = [];
  for (const eventIndex in transferEvents) {
    const event = transferEvents[eventIndex];
    const tokenId = event?.args?.tokenId.toString();
    mintedIdx.push(tokenId);
  }

  const owner = await collectionContract.owner();
  const avatarContractAsOwner = collectionContract.connect(
    await ethers.provider.getSigner(owner)
  );
  return {
    ...avatarSetup,
    avatarContractAsOwner,
    mintedIdx,
    minterAddress: deployer.address,
  };
}

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

  return wallet.signMessage(
    ethers.getBytes(ethers.keccak256(hashedData))
  );
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

  return wallet.signMessage(
    ethers.getBytes(ethers.keccak256(hashedData))
  );
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
  return wallet.signMessage(
    ethers.getBytes(ethers.keccak256(hashedData))
  );
}

async function setupTransferSand(sandContractAsOwner: FakePolygonSand) {
  return async (address: string, amount: string) => {
    const amountToSend = parseUnits(amount.toString(), 'ether');    
    await sandContractAsOwner.donateTo(address, amountToSend)
  };
}

function mintSetup(
  collectionContract: AvatarCollection,
  sandContract: PolygonSand) 
{
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
    const encodedData = collectionContract.interface.encodeFunctionData('mint', [
      address,
      amount,
      signatureId,
      signature,
    ]);
    const contract = sandContract.connect(await ethers.provider.getSigner(address));
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
  collectionContract: AvatarCollection,
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

    const contract = collectionContract.connect(await ethers.provider.getSigner(address));

    return await contract.personalize(signatureId, signature, tokenId, personalizationMask);
  };
}
