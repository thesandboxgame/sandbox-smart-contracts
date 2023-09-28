import { ethers } from 'hardhat';
import {parseUnits} from 'ethers';
import {deployFakeSandContract, getTestingAccounts} from "./fixtures";
import { setupCollectionFactory } from './factory';

export async function setupAvatarCollectionContract() {

  const {
    treasury,
    raffleSignWallet,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    nftCollectionAdmin,
    sandAdmin,
    trustedForwarder,
  } = await getTestingAccounts();

  const {
    collectionFactoryContract,
    collectionFactoryAsOwner,
    factoryOwner,
    avatarCollectionContract,
    randomWallet,    
  } = await setupCollectionFactory();

  const mintToDeployerAmount = parseUnits('100000000', 'ether');
  // setup arguments
  const {
    polygonSandContract,
    sandContractAsOwner
  } = await deployFakeSandContract(sandAdmin, mintToDeployerAmount);
  // raffleSignWallet (taken from name accounts): wallet that can sign
  // nftCollectionAdmin (taken from name accounts): owner of collection
  // treasury (taken from name accounts): treasury
  const collectionName = 'MockAvatarTesting';
  const collectionSymbol = 'MAT';
  const MAX_SUPPLY = 500;
  const maxMarketingTokens = 50;
  const metadataUrl = 'https://contracts-demo.sandbox.game/avatarcollection-unrevealed/';

  // OpenSea configurations // // //
  // defaultOperatorFiltererRegistry (taken from named accounts): address of registry
  // defaultOperatorFiltererSubscription (taken from named accounts): address of filter subscription
  const operatorFiltererSubscriptionSubscribe = true; // if to actually subscribe or just copy

  // default values used for minting setups // // //
  const mintPrice = parseUnits('100', 'ether');
  const maxPublicTokensPerWallet = 4;
  const maxAllowlistTokensPerWallet = 2;

  // references to implementation
  const implementationAlias = ethers.encodeBytes32String('main-avatar');

  // encode arguments to be used as initialize data for the collection  
  const encodedInitializationArgs = avatarCollectionContract.interface.encodeFunctionData(
    'initialize',
    [
      nftCollectionAdmin.address,
      metadataUrl,
      collectionName,
      collectionSymbol,
      treasury.address,
      raffleSignWallet.address,
      trustedForwarder.address,
      await polygonSandContract.getAddress(),
      MAX_SUPPLY,
      [
        defaultOperatorFiltererRegistry.address,
        defaultOperatorFiltererSubscription.address,
        operatorFiltererSubscriptionSubscribe,
      ],
      [
        mintPrice,
        maxPublicTokensPerWallet,
        maxAllowlistTokensPerWallet,
        maxMarketingTokens,
      ],
    ]
  );
  // console.log(`encodedInitializationArgs:`, encodedInitializationArgs);
  // console.log(`deploying "${collectionName}" ...`);
  const deployTx = await collectionFactoryAsOwner.deployCollection(
    implementationAlias,
    encodedInitializationArgs
  );
  await deployTx.wait(); // a must
  
  // for now, the last CollectionAdded is taken. If this is not ok, will use a TX parser
  const collectionAddedEvents = await collectionFactoryAsOwner.queryFilter(
    collectionFactoryAsOwner.filters.CollectionAdded()
  );
  const collectionAddress = collectionAddedEvents.slice(-1)[0].args?.[1];
  // console.log(`deployed at ${collectionAddress} (tx: ${deployTx.hash})`);

  const collectionContract = await ethers.getContractAt("AvatarCollection", collectionAddress);
  
  // avatarCollectionAsRandomWallet
  const owner = await collectionContract.owner();  
  const collectionContractAsOwner = collectionContract.connect(
    await ethers.provider.getSigner(owner)
  );

  const collectionContractAsRandomWallet = collectionContract.connect(
    await ethers.provider.getSigner(randomWallet.address)
  );

  return {    
    polygonSandContract,
    sandContractAsOwner,
    collectionFactoryContract,
    collectionFactoryAsOwner,
    factoryOwner,
    collectionContract,
    collectionOwner: owner,    
    collectionContractAsOwner,
    randomWallet,
    collectionContractAsRandomWallet
  }
};