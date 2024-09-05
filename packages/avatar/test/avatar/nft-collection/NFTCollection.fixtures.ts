import {ethers, network, upgrades} from 'hardhat';
import {AddressLike, BigNumberish, Contract, parseUnits, Signer} from 'ethers';
import {NFTCollection} from '../../../typechain-types';
import {getTestingAccounts, setupMockERC20} from '../fixtures';

export async function setupNFTCollectionContract() {
  const accounts = await getTestingAccounts();
  const collectionName = 'MockNFTTesting';
  const collectionSymbol = 'MAT';
  const maxSupply = 500;
  const waveMaxTokensOverall = 100;
  const waveMaxTokensPerWallet = 13;
  const mintPrice = parseUnits('100', 'ether');
  const metadataUrl =
    'https://contracts-demo.sandbox.game/NFTCollection-unrevealed/';

  const collectionOwner = accounts.nftCollectionAdmin;
  const sandContract = await setupMockERC20();
  const initializeArgs = [
    collectionOwner.address,
    metadataUrl,
    collectionName,
    collectionSymbol,
    accounts.treasury.address,
    accounts.raffleSignWallet.address,
    accounts.trustedForwarder.address,
    await sandContract.getAddress(),
    maxSupply,
  ];
  const NFTCollectionFactory = await ethers.getContractFactory('NFTCollection');
  const collectionContract = (await upgrades.deployProxy(
    NFTCollectionFactory,
    initializeArgs,
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
  const authSign = setupSignAuthMessageAs(
    collectionContract,
    accounts.raffleSignWallet
  );

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
    const args = [...initializeArgs];
    args[idx] = val;
    return args;
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
      await collectionContractAsOwner.batchMint([[wallet, amount]]);
      const transferEvents = await collectionContractAsOwner.queryFilter(
        'Transfer'
      );
      return transferEvents.map((x) => x.args.tokenId);
    },
    authSign,
    personalizeSignature: setupPersonalizeSign(
      collectionContract,
      accounts.raffleSignWallet
    ),
    initializeArgs,
    deployWithCustomArg: async (idx: number, val) => {
      const args = getCustomArgs(idx, val);
      return await upgrades.deployProxy(NFTCollectionFactory, args, {
        initializer: 'initialize',
      });
    },
    getCustomArgs,
  };
}

function setupSignAuthMessageAs(contract: Contract, raffleSignWallet: Signer) {
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
