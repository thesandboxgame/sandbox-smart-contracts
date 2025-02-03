import {AddressLike, BigNumberish, Contract, parseUnits, Signer} from 'ethers';
import {ethers, network, upgrades} from 'hardhat';
import {NFTCollection} from '../../../typechain-types';
import {getTestingAccounts, setupMockERC20} from '../fixtures';

export enum MintDenialReason {
  None,
  NotConfigured,
  InvalidAmount,
  GlobalMaxTokensPerWalletExceeded,
  WaveMaxTokensOverallExceeded,
  WaveMaxTokensPerWalletExceeded,
  MaxSupplyExceeded,
}

export async function setupNFTCollectionContract() {
  const accounts = await getTestingAccounts();
  const collectionName = 'MockNFTTesting';
  const collectionSymbol = 'MAT';
  const maxSupply = 100;
  const waveMaxTokensOverall = 50;
  const waveMaxTokensPerWallet = 10;
  const mintPrice = parseUnits('100', 'ether');
  const metadataUrl =
    'https://contracts-demo.sandbox.game/NFTCollection-unrevealed/';
  const maxTokensPerWallet = 20;

  const collectionOwner = accounts.nftCollectionAdmin;
  const sandContract = await setupMockERC20();

  interface InitializeArgs {
    collectionOwner: string;
    initialBaseURI: string;
    name: string;
    symbol: string;
    mintTreasury: string;
    signAddress: string;
    initialTrustedForwarder: string;
    allowedToExecuteMint: string;
    maxSupply: number;
    maxTokensPerWallet: number;
  }

  const initializeArgs: InitializeArgs = {
    collectionOwner: collectionOwner.address,
    initialBaseURI: metadataUrl,
    name: collectionName,
    symbol: collectionSymbol,
    mintTreasury: accounts.treasury.address,
    signAddress: accounts.raffleSignWallet.address,
    initialTrustedForwarder: accounts.trustedForwarder.address,
    allowedToExecuteMint: await sandContract.getAddress(),
    maxSupply: maxSupply,
    maxTokensPerWallet: maxTokensPerWallet,
  };

  const NFTCollectionFactory = await ethers.getContractFactory('NFTCollection');
  const collectionContract = (await upgrades.deployProxy(
    NFTCollectionFactory,
    [initializeArgs],
    {
      from: accounts.deployer,
      initializer: 'initialize',
    }
  )) as NFTCollection;
  const MockOperatorFilterRegistry = await ethers.getContractFactory(
    'MockOperatorFilterRegistry'
  );
  const mockOperatorFilterRegistry = await MockOperatorFilterRegistry.connect(
    accounts.deployer
  ).deploy();

  const collectionContractAsOwner = collectionContract.connect(collectionOwner);
  const mintSign = setupMintSign(collectionContract, accounts.raffleSignWallet);
  const NFTCollectionMock = await ethers.getContractFactory(
    'NFTCollectionMock'
  );
  const nftCollectionMock = await NFTCollectionMock.connect(
    accounts.deployer
  ).deploy(collectionOwner.address, accounts.trustedForwarder.address);

  async function setupDefaultWave(price: BigNumberish) {
    await collectionContractAsOwner.setupWave(
      waveMaxTokensOverall,
      waveMaxTokensPerWallet,
      price
    );
  }

  function getCustomArgs(idx: number, val) {
    const args = {...initializeArgs};
    const keys = Object.keys(initializeArgs);
    if (idx >= 0 && idx < keys.length) {
      args[keys[idx]] = val;
    }
    return [args];
  }

  const MockERC721Holder = await ethers.getContractFactory('MockERC721Holder');
  const mockERC721Holder = await MockERC721Holder.connect(
    accounts.deployer
  ).deploy();
  return {
    NFTCollectionFactory,
    ...accounts,
    metadataUrl,
    collectionName,
    collectionSymbol,
    maxSupply,
    waveMaxTokensOverall,
    waveMaxTokensPerWallet,
    maxTokensPerWallet,
    mintPrice,
    sandContract,
    collectionOwner,
    collectionContract,
    collectionContractAsOwner,
    collectionContractAsRandomWallet: collectionContract.connect(
      accounts.randomWallet
    ),
    collectionContractAsRandomWallet2: collectionContract.connect(
      accounts.randomWallet2
    ),
    collectionContractAsTrustedForwarder: collectionContract.connect(
      accounts.trustedForwarder
    ),
    nftCollectionMock,
    nftCollectionMockAsRandomWallet: nftCollectionMock.connect(
      accounts.randomWallet
    ),
    nftCollectionMockAsTrustedForwarder: nftCollectionMock.connect(
      accounts.trustedForwarder
    ),
    mockERC20: await setupMockERC20(),
    mockOperatorFilterRegistry,
    mockERC721Holder,
    setupDefaultWave,
    mint: async (amount, wallet = collectionOwner) => {
      await setupDefaultWave(0);
      await collectionContractAsOwner.batchMint(0, [[wallet, amount]]);
      const transferEvents = await collectionContractAsOwner.queryFilter(
        'Transfer'
      );
      return transferEvents.map((x) => x.args.tokenId);
    },
    mintSign,
    waveMintSign: setupWaveSign(collectionContract, accounts.raffleSignWallet),
    personalizeSignature: setupPersonalizeSign(
      collectionContract,
      accounts.raffleSignWallet
    ),
    revealSig: setupRevealSign(collectionContract, accounts.raffleSignWallet),
    initializeArgs,
    deployWithCustomArg: async (partialArgs: Partial<InitializeArgs>) => {
      const args = {...initializeArgs, ...partialArgs};
      return await upgrades.deployProxy(NFTCollectionFactory, [args], {
        initializer: 'initialize',
      });
    },
    getCustomArgs,
  };
}

function setupMintSign(contract: Contract, raffleSignWallet: Signer) {
  return async (
    destinationWallet: AddressLike,
    signatureId: BigNumberish,
    signerWallet: Signer = raffleSignWallet,
    contractAddress: string | undefined = undefined,
    chainId: number = network.config.chainId
  ) => {
    if (!contractAddress) {
      contractAddress = await contract.getAddress();
    }
    if (destinationWallet instanceof Promise) {
      destinationWallet = await destinationWallet;
    }
    if (
      typeof destinationWallet != 'string' &&
      'getAddress' in destinationWallet
    ) {
      destinationWallet = await destinationWallet.getAddress();
    }
    const hashedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'address', 'uint256'],
      [destinationWallet, signatureId, contractAddress, chainId]
    );
    // https://docs.ethers.org/v6/migrating/
    return signerWallet.signMessage(
      ethers.getBytes(ethers.keccak256(hashedData))
    );
  };
}

function setupWaveSign(contract: Contract, raffleSignWallet: Signer) {
  return async (
    destinationWallet: AddressLike,
    amount: BigNumberish,
    waveIndex: BigNumberish,
    signatureId: BigNumberish,
    signerWallet: Signer = raffleSignWallet,
    contractAddress: string | undefined = undefined,
    chainId: number = network.config.chainId
  ) => {
    if (!contractAddress) {
      contractAddress = await contract.getAddress();
    }
    if (destinationWallet instanceof Promise) {
      destinationWallet = await destinationWallet;
    }
    if (
      typeof destinationWallet != 'string' &&
      'getAddress' in destinationWallet
    ) {
      destinationWallet = await destinationWallet.getAddress();
    }
    const hashedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'uint256', 'address', 'uint256'],
      [destinationWallet, waveIndex, signatureId, contractAddress, chainId]
    );
    // https://docs.ethers.org/v6/migrating/
    return signerWallet.signMessage(
      ethers.getBytes(ethers.keccak256(hashedData))
    );
  };
}

function setupRevealSign(contract: Contract, raffleSignWallet: Signer) {
  return async (
    destinationWallet: AddressLike,
    signatureId: BigNumberish,
    signerWallet: Signer = raffleSignWallet,
    contractAddress: string | undefined = undefined,
    chainId: number = network.config.chainId
  ) => {
    if (!contractAddress) {
      contractAddress = await contract.getAddress();
    }
    if (destinationWallet instanceof Promise) {
      destinationWallet = await destinationWallet;
    }
    if (
      typeof destinationWallet != 'string' &&
      'getAddress' in destinationWallet
    ) {
      destinationWallet = await destinationWallet.getAddress();
    }
    const hashedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'address', 'uint256', 'string'],
      [destinationWallet, signatureId, contractAddress, chainId, 'reveal']
    );
    // https://docs.ethers.org/v6/migrating/
    return signerWallet.signMessage(
      ethers.getBytes(ethers.keccak256(hashedData))
    );
  };
}

function setupPersonalizeSign(contract: Contract, raffleSignWallet: Signer) {
  return async (
    destinationWallet: AddressLike,
    tokenId: BigNumberish,
    personalizationMask: BigNumberish,
    signatureId: BigNumberish,
    signerWallet: Signer = raffleSignWallet,
    contractAddress: string | undefined = undefined,
    chainId: number = network.config.chainId
  ) => {
    if (!contractAddress) {
      contractAddress = await contract.getAddress();
    }
    if (destinationWallet instanceof Promise) {
      destinationWallet = await destinationWallet;
    }
    if ('getAddress' in destinationWallet) {
      destinationWallet = await destinationWallet.getAddress();
    }
    const hashedData = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'address', 'uint256', 'uint256', 'uint256'],
      [
        destinationWallet,
        signatureId,
        contractAddress,
        chainId,
        tokenId,
        personalizationMask,
      ]
    );
    // https://docs.ethers.org/v6/migrating/
    return signerWallet.signMessage(
      ethers.getBytes(ethers.keccak256(hashedData))
    );
  };
}
