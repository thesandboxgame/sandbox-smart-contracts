import hre, {ethers} from 'hardhat';

// TODO: why aren't we using backendAuthWallet default same as core?

async function burnAndRevealSignature(
  recipient: string,
  prevTokenId: number,
  amounts: number[],
  metadataHashes: string[],
  revealHashes: string[]
): Promise<string> {
  const {getNamedAccounts} = hre;
  const {backendAuthWallet} = await getNamedAccounts();

  const AssetRevealContract = await ethers.getContract('AssetReveal');
  const signer = ethers.provider.getSigner(backendAuthWallet);

  const data = {
    types: {
      InstantReveal: [
        {name: 'recipient', type: 'address'},
        {name: 'prevTokenId', type: 'uint256'},
        {name: 'amounts', type: 'uint256[]'},
        {name: 'metadataHashes', type: 'string[]'},
        {name: 'revealHashes', type: 'bytes32[]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Reveal',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
    },
  };
  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

async function batchRevealSignature(
  recipient: string,
  prevTokenIds: number[],
  amounts: number[][],
  metadataHashes: string[][],
  revealHashes: string[][]
): Promise<string> {
  // get named accounts from hardhat
  const {getNamedAccounts} = hre;
  const {backendAuthWallet} = await getNamedAccounts();

  const AssetRevealContract = await ethers.getContract('AssetReveal');

  const signer = ethers.provider.getSigner(backendAuthWallet);
  const data = {
    types: {
      BatchReveal: [
        {name: 'recipient', type: 'address'},
        {name: 'prevTokenIds', type: 'uint256[]'},
        {name: 'amounts', type: 'uint256[][]'},
        {name: 'metadataHashes', type: 'string[][]'},
        {name: 'revealHashes', type: 'bytes32[][]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Reveal',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenIds,
      amounts,
      metadataHashes,
      revealHashes,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

async function revealSignature(
  recipient: string,
  prevTokenId: number,
  amounts: number[],
  metadataHashes: string[],
  revealHashes: string[]
): Promise<string> {
  // get named accounts from hardhat
  const {getNamedAccounts} = hre;
  const {backendAuthWallet} = await getNamedAccounts();

  const AssetRevealContract = await ethers.getContract('AssetReveal');

  const signer = ethers.provider.getSigner(backendAuthWallet);

  // "Reveal(address recipient,uint256 prevTokenId,uint256[] amounts,string[] metadataHashes)"
  const data = {
    types: {
      Reveal: [
        {name: 'recipient', type: 'address'},
        {name: 'prevTokenId', type: 'uint256'},
        {name: 'amounts', type: 'uint256[]'},
        {name: 'metadataHashes', type: 'string[]'},
        {name: 'revealHashes', type: 'bytes32[]'},
      ],
    },
    domain: {
      name: 'Sandbox Asset Reveal',
      version: '1.0',
      chainId: hre.network.config.chainId,
      verifyingContract: AssetRevealContract.address,
    },
    message: {
      recipient,
      prevTokenId,
      amounts,
      metadataHashes,
      revealHashes,
    },
  };

  const signature = await signer._signTypedData(
    data.domain,
    data.types,
    data.message
  );
  return signature;
}

export {burnAndRevealSignature, batchRevealSignature, revealSignature};
