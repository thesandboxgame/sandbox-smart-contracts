import {deployments} from 'hardhat';
import {
  createAssetMintSignature,
  createMultipleAssetsMintSignature,
} from '../utils/createSignature';

export const runCreateTestSetup = deployments.createFixture(
  async ({deployments, getNamedAccounts, ethers}) => {
    await deployments.fixture(['Asset', 'AssetCreate', 'AuthValidator']);
    const {deployer, catalystMinter} = await getNamedAccounts();
    const AssetContract = await ethers.getContract('Asset', deployer);

    // SETUP ROLES
    const MinterRole = await AssetContract.MINTER_ROLE();
    const AssetCreateContract = await ethers.getContract(
      'AssetCreate',
      deployer
    );
    const AuthValidatorContract = await ethers.getContract(
      'AuthValidator',
      deployer
    );
    await AssetContract.grantRole(MinterRole, AssetCreateContract.address);

    const CatalystContract = await ethers.getContract('Catalyst', deployer);
    const CatalystMinterRole = await CatalystContract.MINTER_ROLE();
    await CatalystContract.grantRole(
      CatalystMinterRole,
      AssetCreateContract.address
    );
    // END SETUP ROLES

    const mintCatalyst = async (
      tier: number,
      amount: number,
      to = deployer
    ) => {
      const signer = ethers.provider.getSigner(catalystMinter);
      await CatalystContract.connect(signer).mint(to, tier, amount);
    };

    const mintSingleAsset = async (
      signature: string,
      tier: number,
      amount: number,
      revealed: boolean,
      metadataHash: string
    ) => {
      await AssetCreateContract.createAsset(
        signature,
        tier,
        amount,
        revealed,
        metadataHash,
        deployer
      );
    };

    const mintMultipleAssets = async (
      signature: string,
      tiers: number[],
      amounts: number[],
      revealed: boolean[],
      metadataHashes: string[]
    ) => {
      await AssetCreateContract.createMultipleAssets(
        signature,
        tiers,
        amounts,
        revealed,
        metadataHashes,
        deployer
      );
    };

    const SpecialMinterRole = await AssetCreateContract.SPECIAL_MINTER_ROLE();

    const grantSpecialMinterRole = async (address: string) => {
      await AssetCreateContract.grantRole(SpecialMinterRole, address);
    };

    const mintSpecialAsset = async (
      signature: string,
      tier: number,
      amount: number,
      revealed: boolean,
      metadataHash: string
    ) => {
      await AssetCreateContract.createSpecialAsset(
        signature,
        tier,
        amount,
        revealed,
        metadataHash,
        deployer
      );
    };
    const getCreatorNonce = async (creator: string) => {
      const nonce = await AssetCreateContract.creatorNonces(creator);
      return nonce;
    };

    const generateSingleMintSignature = async (
      creator: string,
      tier: number,
      amount: number,
      revealed: boolean,
      metadataHash: string
    ) => {
      const signature = await createAssetMintSignature(
        creator,
        tier,
        amount,
        revealed,
        metadataHash
      );
      return signature;
    };

    const generateMultipleMintSignature = async (
      creator: string,
      tiers: number[],
      amounts: number[],
      revealed: boolean[],
      metadataHashes: string[]
    ) => {
      const signature = await createMultipleAssetsMintSignature(
        creator,
        tiers,
        amounts,
        revealed,
        metadataHashes
      );
      return signature;
    };

    return {
      metadataHashes: [
        'QmZvGR5JNtSjSgSL9sD8V3LpSTHYXcfc9gy3CqptuoETJA',
        'QmcU8NLdWyoDAbPc67irYpCnCH9ciRUjMC784dvRfy1Fja',
      ],
      additionalMetadataHash: 'QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L',
      deployer,
      otherWallet: '0xB37d8F5d1fEab932f99b2dC8ABda5F413043400B',
      AssetContract,
      AssetCreateContract,
      AuthValidatorContract,
      CatalystContract,
      mintCatalyst,
      mintSingleAsset,
      mintMultipleAssets,
      mintSpecialAsset,
      grantSpecialMinterRole,
      generateSingleMintSignature,
      generateMultipleMintSignature,
      getCreatorNonce,
    };
  }
);
