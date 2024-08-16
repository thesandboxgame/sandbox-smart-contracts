import {ethers, network, upgrades} from 'hardhat';
import {AddressLike, BigNumberish, Contract, parseUnits, Signer} from 'ethers';
import {NFTCollection} from '../../../typechain-types';
import {getTestingAccounts, setupMockERC20} from '../fixtures';

export async function setupNFTCollectionContract() {
  const accounts = await getTestingAccounts();
  const collectionName = 'MockNFTTesting';
  const collectionSymbol = 'MAT';
  const maxSupply = 500;
  const maxMarketingTokens = 50;
  const metadataUrl =
    'https://contracts-demo.sandbox.game/NFTCollection-unrevealed/';

  const mintPrice = parseUnits('100', 'ether');
  const maxPublicTokensPerWallet = 4;
  const maxAllowListTokensPerWallet = 2;

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
    [
      mintPrice,
      maxPublicTokensPerWallet,
      maxAllowListTokensPerWallet,
      maxMarketingTokens,
    ],
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
  return {
    ...accounts,
    metadataUrl,
    collectionName,
    collectionSymbol,
    maxSupply,
    mintPrice,
    maxPublicTokensPerWallet,
    maxAllowListTokensPerWallet,
    maxMarketingTokens,
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
    mockERC20: await setupMockERC20(),
    mockOperatorFilterRegistry,
    mint: async (amount, wallet = collectionOwner) => {
      await collectionContractAsOwner.setMarketingMint();
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
    deployWithCustomArg: async (idx: number, val) => {
      const args = [...initializeArgs];
      args[idx] = val;
      return await upgrades.deployProxy(NFTCollectionFactory, args, {
        initializer: 'initialize',
      });
    },
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
    if ('getAddress' in destinationWallet) {
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
