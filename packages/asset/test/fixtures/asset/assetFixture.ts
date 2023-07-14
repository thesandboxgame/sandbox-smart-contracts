import {ethers, upgrades} from 'hardhat';

const DEFAULT_BPS = 300;

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

export async function runAssetSetup() {
  const [
    assetAdmin,
    owner,
    secondOwner,
    bridgeMinter,
    minter,
    burner,
    trustedForwarder,
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
  const AssetContract = await upgrades.deployProxy(
    AssetFactory,
    [
      trustedForwarder.address,
      assetAdmin.address,
      [1, 2, 3, 4, 5, 6],
      [2, 4, 6, 8, 10, 12],
      'ipfs://',
      commonRoyaltyReceiver.address,
      DEFAULT_BPS,
      RoyaltyManagerContract.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await AssetContract.deployed();

  // Asset contract is not user-facing and we block users from minting directly
  // Contracts that interact with Asset must have the necessary ROLE
  // Here we set up the necessary roles for testing
  const AssetContractAsAdmin = await AssetContract.connect(assetAdmin);
  const AssetContractAsMinter = await AssetContract.connect(minter);
  const AssetContractAsBurner = await AssetContract.connect(burner);
  const AssetContractAsOwner = await AssetContract.connect(owner);
  const defaultAdminRole = await AssetContract.DEFAULT_ADMIN_ROLE();
  const minterRole = await AssetContract.MINTER_ROLE();
  const burnerRole = await AssetContract.BURNER_ROLE();
  const bridgeMinterRole = await AssetContract.BRIDGE_MINTER_ROLE();
  await AssetContractAsAdmin.grantRole(minterRole, minter.address);
  await AssetContractAsAdmin.grantRole(burnerRole, burner.address);
  await AssetContractAsAdmin.grantRole(bridgeMinterRole, bridgeMinter.address);
  // end set up roles

  const uris = [
    'QmSRVTH8VumE42fqmdzPHuA57LjCaUXQRequVzEDTGMyHY',
    'QmTeRr1J2kaKM6e1m8ixLfZ31hcb7XNktpbkWY5tMpjiFR',
    'QmUxnKe5DyjxKuwq2AMGDLYeQALnQxcffCZCgtj5a41DYw',
    'QmYQztw9x8WyrUFDxuc5D4xYaN3pBXWNGNAaguvfDhLLgg',
    'QmUXH1JBPMYxCmzNEMRDGTPtHmePvbo4uVEBreN3sowDwG',
    'QmdRwSPCuPGfxSYTaot9Eqz8eU9w1DGp8mY97pTCjnSWqk',
    'QmNrwUiZfQLYaZFHNLzxqfiLxikKYRzZcdWviyDaNhrVhm',
  ];
  const baseUri = 'ipfs://';

  return {
    AssetContract,
    AssetContractAsOwner,
    AssetContractAsMinter,
    AssetContractAsBurner,
    AssetContractAsAdmin,
    owner,
    secondOwner,
    bridgeMinter,
    minterRole,
    burnerRole,
    defaultAdminRole,
    bridgeMinterRole,
    uris,
    baseUri,
  };
}
