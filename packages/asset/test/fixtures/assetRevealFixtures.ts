import {ethers, upgrades} from 'hardhat';
import {
  batchRevealSignature,
  burnAndRevealSignature,
  revealSignature,
} from '../utils/revealSignature';
import {
  CATALYST_BASE_URI,
  CATALYST_DEFAULT_ROYALTY,
  CATALYST_IPFS_CID_PER_TIER,
} from '../../data/constants';

const name = 'Sandbox Asset Reveal';
const version = '1.0';

export async function runRevealTestSetup() {
  const [
    catalystMinter,
    trustedForwarder,
    assetAdmin,
    user,
    catalystRoyaltyRecipient,
    catalystAdmin,
    authValidatorAdmin,
    backendAuthWallet,
  ] = await ethers.getSigners();

  // test upgradeable contract using '@openzeppelin/hardhat-upgrades'
  // DEPLOY DEPENDENCIES: ASSET, CATALYST, AUTH VALIDATOR, OPERATOR FILTER REGISTRANT
  // note: reveal tests use a MockMinter instead of AssetCreate

  const OperatorFilterRegistrantFactory = await ethers.getContractFactory(
    'OperatorFilterRegistrant'
  );
  const OperatorFilterRegistrantContract =
    await OperatorFilterRegistrantFactory.deploy();

  const AssetFactory = await ethers.getContractFactory('Asset');
  const AssetContract = await upgrades.deployProxy(
    AssetFactory,
    [trustedForwarder.address, assetAdmin.address, 'ipfs://'],
    {
      initializer: 'initialize',
    }
  );

  await AssetContract.deployed();

  const CatalystFactory = await ethers.getContractFactory('Catalyst');
  const CatalystContract = await upgrades.deployProxy(
    CatalystFactory,
    [
      CATALYST_BASE_URI,
      trustedForwarder.address,
      catalystRoyaltyRecipient.address,
      OperatorFilterRegistrantContract.address,
      catalystAdmin.address, // DEFAULT_ADMIN_ROLE
      catalystMinter.address, // MINTER_ROLE
      CATALYST_DEFAULT_ROYALTY,
      CATALYST_IPFS_CID_PER_TIER,
    ],
    {
      initializer: 'initialize',
    }
  );

  await CatalystContract.deployed();

  const AuthValidatorFactory = await ethers.getContractFactory('AuthValidator');
  const AuthValidatorContract = await AuthValidatorFactory.deploy(
    authValidatorAdmin.address
  );

  await AuthValidatorContract.deployed();

  // END DEPLOY DEPENDENCIES

  const AssetRevealFactory = await ethers.getContractFactory('AssetReveal');

  const AssetRevealContract = await upgrades.deployProxy(
    AssetRevealFactory,
    [
      name,
      version,
      AssetContract.address,
      AuthValidatorContract.address,
      trustedForwarder.address,
    ],
    {
      initializer: 'initialize',
    }
  );

  await AssetRevealContract.deployed();

  // SETUP VALIDATOR
  await AuthValidatorContract.connect(authValidatorAdmin).setSigner(
    AssetRevealContract.address,
    backendAuthWallet.address
  );

  // SET UP ROLES
  const AssetRevealContractAsUser = AssetRevealContract.connect(user);
  const AssetRevealContractAsAdmin = AssetRevealContract.connect(assetAdmin);

  const MockMinterFactory = await ethers.getContractFactory('MockMinter');
  const MockMinterContract = await MockMinterFactory.deploy(
    AssetContract.address
  );
  const AssetContractAsAdmin = AssetContract.connect(assetAdmin);
  // add mock minter as minter
  const MinterRole = await AssetContract.MINTER_ROLE();
  const BurnerRole = await AssetContract.BURNER_ROLE();
  await AssetContractAsAdmin.grantRole(MinterRole, MockMinterContract.address);

  // add AssetReveal contracts as both MINTER and BURNER for Asset contract
  await AssetContractAsAdmin.grantRole(MinterRole, AssetRevealContract.address);
  await AssetContractAsAdmin.grantRole(BurnerRole, AssetRevealContract.address);
  // END SET UP ROLES

  // SETUP USER WITH MINTED ASSETS
  // mint a tier 5 asset with 10 copies
  const unRevMintTx = await MockMinterContract.mintAsset(
    user.address,
    10, // amount
    5, // tier
    false, // revealed
    'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA' // metadata hash
  );
  const unRevResult = await unRevMintTx.wait();
  const unrevealedtokenId = unRevResult.events[2].args.tokenId.toString();

  // mint a tier 5 asset with 10 copies
  const unRevMintTx2 = await MockMinterContract.mintAsset(
    user.address,
    10,
    5,
    false,
    'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJD'
  );
  const unRevResult2 = await unRevMintTx2.wait();
  const unrevealedtokenId2 = unRevResult2.events[2].args.tokenId.toString();

  // mint a revealed version, tier 5 asset with 10 copies
  const revMintTx = await MockMinterContract.mintAsset(
    user.address,
    10,
    5,
    true,
    'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJC'
  );

  const revResult = await revMintTx.wait();
  const revealedtokenId = revResult.events[2].args.tokenId.toString();
  // END SETUP USER WITH MINTED ASSETS

  // HELPER FUNCTIONS
  const revealAsset = async (
    signature: string,
    tokenId: number,
    amounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const tx = await AssetRevealContractAsUser.revealMint(
      signature,
      tokenId,
      amounts,
      metadataHashes,
      revealHashes
    );
    const result = await tx.wait();
    return result;
  };

  const revealAssetBatch = async (
    signature: string,
    tokenIds: number[],
    amounts: number[][],
    metadataHashes: string[][],
    revealHashes: string[][]
  ) => {
    const tx = await AssetRevealContractAsUser.revealBatchMint(
      signature,
      tokenIds,
      amounts,
      metadataHashes,
      revealHashes
    );
    const result = await tx.wait();
    return result;
  };

  const instantReveal = async (
    signature: string,
    tokenId: number,
    burnAmount: number,
    mintAmounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const tx = await AssetRevealContractAsUser.burnAndReveal(
      signature,
      tokenId,
      burnAmount,
      mintAmounts,
      metadataHashes,
      revealHashes
    );
    const result = await tx.wait();
    return result;
  };

  const generateRevealSignature = async (
    revealer: string,
    prevTokenId: number,
    amounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const signature = await revealSignature(
      revealer,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
      AssetRevealContract,
      backendAuthWallet
    );
    return signature;
  };

  const generateBatchRevealSignature = async (
    revealer: string,
    prevTokenIds: number[],
    amounts: number[][],
    metadataHashes: string[][],
    revealHashes: string[][]
  ) => {
    const signature = await batchRevealSignature(
      revealer,
      prevTokenIds,
      amounts,
      metadataHashes,
      revealHashes,
      AssetRevealContract,
      backendAuthWallet
    );
    return signature;
  };

  const generateBurnAndRevealSignature = async (
    revealer: string,
    prevTokenId: number,
    amounts: number[],
    metadataHashes: string[],
    revealHashes: string[]
  ) => {
    const signature = await burnAndRevealSignature(
      revealer,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
      AssetRevealContract,
      backendAuthWallet
    );
    return signature;
  };
  // END HELPER FUNCTIONS

  return {
    generateRevealSignature,
    generateBatchRevealSignature,
    generateBurnAndRevealSignature,
    revealAsset,
    revealAssetBatch,
    instantReveal,
    AssetRevealContract,
    AssetRevealContractAsUser,
    AssetRevealContractAsAdmin,
    AssetContract,
    AuthValidatorContract,
    trustedForwarder,
    unrevealedtokenId,
    unrevealedtokenId2,
    revealedtokenId,
    user,
  };
}
