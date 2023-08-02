import {ethers, upgrades} from 'hardhat';
import {DEFAULT_SUBSCRIPTION} from '../../../data/constants';

export function generateOldAssetId(
  creator: string,
  assetNumber: number,
  isNFT: boolean
) {
  const hex = assetNumber.toString(16);
  const hexLength = hex.length;
  let zeroAppends = '';
  const zeroAppendsLength = 24 - hexLength;
  for (let i = 0; i < zeroAppendsLength; i++) {
    if (i == zeroAppendsLength - 1) {
      if (isNFT) {
        zeroAppends = '8' + zeroAppends;
      } else {
        zeroAppends = zeroAppends + '0';
      }
    } else {
      zeroAppends = zeroAppends + '0';
    }
  }
  return `${creator}${zeroAppends}${hex}`;
}

export function generateAssetId(
  creator: string,
  tier: number,
  nonce: number,
  revealNonce: number,
  Bridged: boolean
) {
  const tierHex = tier.toString(16);
  const tierHexLength = tierHex.length;
  let tierAppend;
  if (tierHexLength >= 2) {
    tierAppend = tierHex.substring(tierHexLength - 2);
  } else {
    tierAppend = '0' + tierHex;
  }

  let nonceHex = nonce.toString(16);
  const nonceLength = nonceHex.length;
  1;
  let nonceAppend;
  if (nonceLength >= 4) {
    nonceAppend = nonceHex.substring(nonceLength - 4);
  } else {
    for (let i = nonceLength; i < 4; i++) {
      nonceHex = '0' + nonceHex;
    }
    nonceAppend = nonceHex;
  }

  let revealNonceHex = revealNonce.toString(16);
  const revealNonceHexLength = revealNonceHex.length;
  let revealNonceAppend;
  if (revealNonceHexLength >= 4) {
    revealNonceAppend = revealNonceHex.substring(revealNonceHexLength - 4);
  } else {
    for (let i = revealNonceHexLength; i < 4; i++) {
      revealNonceHex = '0' + revealNonceHex;
    }
    revealNonceAppend = revealNonceHex;
  }

  const zeroAppends = '0x00000000000000';

  return `${zeroAppends}${
    Bridged ? '1' : '0'
  }${revealNonceAppend}${nonceAppend}${tierAppend}${creator.substring(2)}`;
}

export async function runAssetSetup() {
  const [
    assetAdmin,
    owner,
    secondOwner,
    bridgeMinter,
    minter,
    burner,
    trustedForwarder,
    mockMarketplace1,
    mockMarketplace2,
    commonRoyaltyReceiver,
    managerAdmin,
    contractRoyaltySetter,
  ] = await ethers.getSigners();

  // test upgradeable contract using '@openzeppelin/hardhat-upgrades'

  const RoyaltySplitterFactory = await ethers.getContractFactory(
    'RoyaltySplitter'
  );
  const RoyaltySplitter = await RoyaltySplitterFactory.deploy();

  const RoyaltyManagerFactory = await ethers.getContractFactory(
    'RoyaltyManager'
  );
  const RoyaltyManagerContract = await upgrades.deployProxy(
    RoyaltyManagerFactory,
    [
      commonRoyaltyReceiver.address,
      5000,
      RoyaltySplitter.address,
      managerAdmin.address,
      contractRoyaltySetter.address,
    ],
    {
      initializer: 'initialize',
    }
  );
  await RoyaltyManagerContract.deployed();

  const AssetFactory = await ethers.getContractFactory('Asset');

  const MockOperatorFilterRegistryFactory = await ethers.getContractFactory(
    'MockOperatorFilterRegistry'
  );

  const operatorFilterRegistry = await MockOperatorFilterRegistryFactory.deploy(
    DEFAULT_SUBSCRIPTION,
    [mockMarketplace1.address, mockMarketplace2.address]
  );

  // Operator Filter Registrant
  const OperatorFilterSubscriptionFactory = await ethers.getContractFactory(
    'MockOperatorFilterSubscription'
  );

  // Provide: address _owner, address _localRegistry
  const OperatorFilterSubscriptionContract =
    await OperatorFilterSubscriptionFactory.deploy(
      assetAdmin.address,
      operatorFilterRegistry.address
    );

  const AssetContract = await upgrades.deployProxy(
    AssetFactory,
    [
      trustedForwarder.address,
      assetAdmin.address,
      'ipfs://',
      OperatorFilterSubscriptionContract.address,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await AssetContract.deployed();

  const generateRandomTokenId = () => {
    return ethers.utils.randomBytes(32);
  };

  // Asset contract is not user-facing and we block users from minting directly
  // Contracts that interact with Asset must have the necessary ROLE
  // Here we set up the necessary roles for testing
  const AssetContractAsAdmin = AssetContract.connect(assetAdmin);
  const AssetContractAsMinter = AssetContract.connect(minter);
  const AssetContractAsBurner = AssetContract.connect(burner);
  const AssetContractAsOwner = AssetContract.connect(owner);
  const defaultAdminRole = await AssetContract.DEFAULT_ADMIN_ROLE();
  const minterRole = await AssetContract.MINTER_ROLE();
  const burnerRole = await AssetContract.BURNER_ROLE();
  await AssetContractAsAdmin.grantRole(minterRole, minter.address);
  await AssetContractAsAdmin.grantRole(burnerRole, burner.address);
  // end set up roles

  const MockAsset = await ethers.getContractFactory('MockAsset');
  const MockAssetContract = await MockAsset.deploy();
  await MockAssetContract.deployed();

  const metadataHashes = [
    'QmSRVTH8VumE42fqmdzPHuA57LjCaUXQRequVzEDTGMyHY',
    'QmTeRr1J2kaKM6e1m8ixLfZ31hcb7XNktpbkWY5tMpjiFR',
    'QmUxnKe5DyjxKuwq2AMGDLYeQALnQxcffCZCgtj5a41DYw',
    'QmYQztw9x8WyrUFDxuc5D4xYaN3pBXWNGNAaguvfDhLLgg',
    'QmUXH1JBPMYxCmzNEMRDGTPtHmePvbo4uVEBreN3sowDwG',
    'QmdRwSPCuPGfxSYTaot9Eqz8eU9w1DGp8mY97pTCjnSWqk',
    'QmNrwUiZfQLYaZFHNLzxqfiLxikKYRzZcdWviyDaNhrVhm',
  ];
  const baseURI = 'ipfs://';

  const mintOne = async (
    recipient = minter.address,
    tokenId = generateRandomTokenId(),
    amount = 10,
    metadataHash = metadataHashes[0]
  ) => {
    const tx = await AssetContractAsMinter.mint(
      recipient,
      tokenId,
      amount,
      metadataHash
    );
    await tx.wait();
    return {
      tx,
      tokenId,
      metadataHash,
    };
  };

  const burnOne = async (
    account: string,
    tokenId: Uint8Array,
    amount: number
  ) => {
    const tx = await AssetContractAsBurner.burnFrom(account, tokenId, amount);
    await tx.wait();
    return {
      tx,
      tokenId,
    };
  };

  const mintBatch = async (
    recipient = minter.address,
    tokenIds = [generateRandomTokenId(), generateRandomTokenId()],
    amounts = [10, 5],
    metadata = [metadataHashes[0], metadataHashes[1]]
  ) => {
    const tx = await AssetContractAsMinter.mintBatch(
      recipient,
      tokenIds,
      amounts,
      metadata
    );
    await tx.wait();

    return {
      tx,
      tokenIds,
      metadataHashes,
    };
  };

  const burnBatch = async (
    account: string,
    tokenIds: Uint8Array[],
    amounts: number[]
  ) => {
    const tx = await AssetContractAsBurner.burnBatchFrom(
      account,
      tokenIds,
      amounts
    );
    await tx.wait();

    return {
      tx,
      tokenIds,
    };
  };

  return {
    MockAssetContract,
    AssetContract,
    AssetContractAsOwner,
    AssetContractAsMinter,
    AssetContractAsBurner,
    AssetContractAsAdmin,
    owner,
    assetAdmin,
    minter,
    burner,
    trustedForwarder,
    secondOwner,
    bridgeMinter,
    minterRole,
    burnerRole,
    defaultAdminRole,
    metadataHashes,
    baseURI,
    generateRandomTokenId,
    mintOne,
    burnOne,
    burnBatch,
    mintBatch,
    generateAssetId,
  };
}
