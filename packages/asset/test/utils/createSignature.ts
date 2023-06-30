import hre, {ethers} from 'hardhat';

// TODO: why aren't we using backendAuthWallet default same as core?

const createAssetMintSignature = async (
  creator: string,
  tier: number,
  amount: number,
  revealed: boolean,
  metadataHash: string
) => {
  const {getNamedAccounts} = hre;
  const {backendAuthWallet} = await getNamedAccounts();
  const signer = ethers.provider.getSigner(backendAuthWallet);

  const AssetCreateContract = await ethers.getContract('AssetCreate');

  const nonce = await AssetCreateContract.signatureNonces(creator);

  const data = {
    types: {
      Mint: [
        {name: 'creator', type: 'address'},
        {name: 'nonce', type: 'uint16'},
        {name: 'tier', type: 'uint8'},
        {name: 'amount', type: 'uint256'},
        {name: 'revealed', type: 'bool'},
        {name: 'metadataHash', type: 'string'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetCreateContract.address,
    },
    message: {
      creator,
      nonce,
      tier,
      amount,
      revealed,
      metadataHash,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
};

const createMultipleAssetsMintSignature = async (
  creator: string,
  tiers: number[],
  amounts: number[],
  revealed: boolean[],
  metadataHashes: string[]
) => {
  const {getNamedAccounts} = hre;
  const {backendAuthWallet} = await getNamedAccounts();
  const signer = ethers.provider.getSigner(backendAuthWallet);

  const AssetCreateContract = await ethers.getContract('AssetCreate');

  const nonce = await AssetCreateContract.signatureNonces(creator);
  const data = {
    types: {
      MintBatch: [
        {name: 'creator', type: 'address'},
        {name: 'nonce', type: 'uint16'},
        {name: 'tiers', type: 'uint8[]'},
        {name: 'amounts', type: 'uint256[]'},
        {name: 'revealed', type: 'bool[]'},
        {name: 'metadataHashes', type: 'string[]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Create',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetCreateContract.address,
    },
    message: {
      creator,
      nonce,
      tiers,
      amounts,
      revealed,
      metadataHashes,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
};

// TODO:
const createSpecialAssetMintSignature = async () => {};

export {
  createAssetMintSignature,
  createMultipleAssetsMintSignature,
  createSpecialAssetMintSignature,
};
