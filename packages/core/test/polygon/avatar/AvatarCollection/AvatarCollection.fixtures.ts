import {assert} from 'chai';
import {BigNumber, Contract, Wallet} from 'ethers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {ethers, getNamedAccounts, deployments} from 'hardhat';
import {withSnapshot, waitFor} from '../../../utils';
import {depositViaChildChainManager} from '../../sand/fixtures';
import ERC20Mock from '@openzeppelin/contracts-0.8.15/build/contracts/ERC20PresetMinterPauser.json';

export const raffleSignWallet = new ethers.Wallet(
  '0x4242424242424242424242424242424242424242424242424242424242424242'
);

export const collectionName = "MockAvatarTesting";
export const COLLECTION_MAX_SUPPLY = 500;

const implementationDeployTag = 'AvatarCollectionTest_deploy';

export const setupAvatar = withSnapshot(
  [implementationDeployTag],
  async function (hre) {
    const {sandAdmin} = await getNamedAccounts();

    // const deploymentName = `${collectionName}Proxy`;
    const collectionDeployment = await deployments.get(collectionName);
    const avatarCollectionContract = new ethers.Contract(
      collectionDeployment.address,
      collectionDeployment.abi,
      ethers.provider
    );

    const sandContract = await ethers.getContract('PolygonSand');
    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');

    const SAND_AMOUNT = BigNumber.from(100000).mul('1000000000000000000');

    await depositViaChildChainManager(
      {sand: sandContract, childChainManager},
      sandAdmin,
      SAND_AMOUNT
    );

    return {
      avatarCollectionContract,
      sandContract,
      hre,
      getNamedAccounts,
      setupWave,
      signAuthMessageAs,
      transferSand,
      mint: mintSetup(avatarCollectionContract, sandContract),
      personalizeSignature: validPersonalizeSignature,
      personalize: personalizeSetup(
        avatarCollectionContract,
        validPersonalizeSignature
      ),
      personalizeInvalidSignature: personalizeSetup(
        avatarCollectionContract,
        invalidPersonalizeSignature
      ),
    };
  }
);

export async function setupMockERC20(): Promise<{
  randomTokenContract: Contract;
}> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {deployer} = await getNamedAccounts();

  await deployments.deploy('RandomToken', {
    from: deployer,
    contract: ERC20Mock,
    args: ['RToken', 'RAND'],
    proxy: false,
  });
  return {
    randomTokenContract: await ethers.getContract('RandomToken', deployer),
  };
}

async function setupWave(
  raffle: Contract,
  waveMaxTokens: number,
  waveMaxTokensToBuy: number,
  waveSingleTokenPrice: string
) {
  const {raffleSignWallet} = await getNamedAccounts();

  const owner = await raffle.owner();
  const contract = raffle.connect(ethers.provider.getSigner(owner));

  await contract.setSignAddress(raffleSignWallet);

  await contract.setupWave(
    waveMaxTokens,
    waveMaxTokensToBuy,
    waveSingleTokenPrice
  );
  assert.equal(
    (await raffle.waveMaxTokensOverall()).toString(),
    waveMaxTokens.toString()
  );
  assert.equal(
    (await raffle.signAddress()).toString(),
    raffleSignWallet.toString()
  );
  assert.equal(
    (await raffle.waveMaxTokensPerWallet()).toString(),
    waveMaxTokensToBuy.toString()
  );
  assert.equal(
    (await raffle.waveSingleTokenPrice()).toString(),
    waveSingleTokenPrice.toString()
  );
}

export type AvatarMintingSetup = {
  avatarCollectionContract: Contract;
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
    avatarCollectionContract,
    transferSand,
    setupWave,
    getNamedAccounts,
    hre,
    mint,
  } = avatarSetup;
  const {deployer} = await getNamedAccounts();
  await transferSand(deployer, '1000');
  await setupWave(avatarCollectionContract, mintCount * 2, mintCount, '1');

  await mint(
    raffleSignWallet,
    deployer,
    0,
    avatarCollectionContract.address,
    hre.network.config.chainId || 31337,
    mintCount.toString(),
    mintCount
  );

  const transferEvents = await avatarCollectionContract.queryFilter(
    avatarCollectionContract.filters.Transfer()
  );

  const mintedIdx: string[] = [];
  for (const eventIndex in transferEvents) {
    const event = transferEvents[eventIndex];
    const tokenId = event?.args?.tokenId.toString();
    mintedIdx.push(tokenId);
  }

  const owner = await avatarCollectionContract.owner();
  const avatarContractAsOwner = avatarCollectionContract.connect(
    ethers.provider.getSigner(owner)
  );
  return {
    ...avatarSetup,
    avatarContractAsOwner,
    mintedIdx,
    minterAddress: deployer,
  };
}

function validPersonalizeSignature(
  wallet: Wallet | SignerWithAddress,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number,
  tokenId: number,
  personalizationMask: number
) {
  const hashedData = ethers.utils.defaultAbiCoder.encode(
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
    ethers.utils.arrayify(ethers.utils.keccak256(hashedData))
  );
}

function invalidPersonalizeSignature(
  wallet: Wallet | SignerWithAddress,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number,
  tokenId: number,
  personalizationMask: number
) {
  const hashedData = ethers.utils.defaultAbiCoder.encode(
    ['uint256', 'address', 'uint256', 'uint256', 'uint256'],
    [signatureId, contractAddress, chainId, personalizationMask, tokenId]
  );

  return wallet.signMessage(
    ethers.utils.arrayify(ethers.utils.keccak256(hashedData))
  );
}

function signAuthMessageAs(
  wallet: Wallet | SignerWithAddress,
  address: string,
  signatureId: number,
  contractAddress: string,
  chainId: number
) {
  const hashedData = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256', 'address', 'uint256'],
    [address, signatureId, contractAddress, chainId]
  );
  return wallet.signMessage(
    ethers.utils.arrayify(ethers.utils.keccak256(hashedData))
  );
}

async function transferSand(address: string, amount: string) {
  const {sandBeneficiary} = await getNamedAccounts();
  const sandContract = await ethers.getContract('PolygonSand');

  const sandContractAsSandBeneficiary = sandContract.connect(
    ethers.provider.getSigner(sandBeneficiary)
  );

  await sandContractAsSandBeneficiary.transfer(address, amount);
}

function mintSetup(raffleContract: Contract, sandContract: Contract) {
  return async (
    wallet: Wallet | SignerWithAddress,
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
    const encodedData = raffleContract.interface.encodeFunctionData('mint', [
      address,
      amount,
      signatureId,
      signature,
    ]);
    const contract = sandContract.connect(ethers.provider.getSigner(address));
    return waitFor(
      contract.approveAndCall(
        raffleContract.address,
        approvalAmount,
        encodedData
      )
    );
  };
}

function personalizeSetup(
  raffleContract: Contract,
  signatureFunction: (
    wallet: Wallet | SignerWithAddress,
    address: string,
    signatureId: number,
    contractAddress: string,
    chainId: number,
    tokenId: number,
    personalizationMask: number
  ) => Promise<string>
) {
  return async (
    wallet: Wallet | SignerWithAddress,
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
      raffleContract.address,
      chainId,
      tokenId,
      personalizationMask
    );

    const contract = raffleContract.connect(ethers.provider.getSigner(address));

    return waitFor(
      contract.personalize(signatureId, signature, tokenId, personalizationMask)
    );
  };
}

export async function topUpAddress(
  recipientAddress: string,
  nativeTokenAmount: number
): Promise<void> {
  const signer = ethers.provider.getSigner();

  // Set the amount of ETH to send
  const amountToSend = ethers.utils.parseEther(nativeTokenAmount.toString());

  // Send the transaction
  await signer.sendTransaction({
    to: recipientAddress,
    value: amountToSend,
  });
}
