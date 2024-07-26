import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

/*
This script remains as an example as how to deploy a collection using hardhat. Since we implemented the back-office
deployer this is not needed. Left for inspiration and historical value
*/

// the same as `skipIfAlreadyDeployed` from deployments.deploy but applied to our on-chain logic
const skipIfAlreadyDeployed = true;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers, artifacts} = hre;

  const {
    treasury,
    raffleSignWallet,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    nftCollectionAdmin,
  } = await getNamedAccounts();

  // setup arguments
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2'); // Metatransaction address

  // This deployment script worked when PolygonSand was also in the deploy scripts. This was in core package
  // For now, we hardcode the address here directly sandContractAddress
  // const sandContract = await deployments.get('PolygonSand'); // allowedToExecuteMint address

  // raffleSignWallet (taken from name accounts): wallet that can sign
  // nftCollectionAdmin (taken from name accounts): owner of collection
  // treasury (taken from name accounts): treasury
  const collectionName = 'MockAvatarTesting';
  const collectionSymbol = 'MAT';
  const MAX_SUPPLY = 500;
  const maxMarketingTokens = 50;

  let sandContractAddress; // allowedToExecuteMint
  let metadataUrl;
  if (hre.network.name === 'polygon') {
    metadataUrl = 'https://contracts.sandbox.game/avatarcollection-unrevealed/';
    sandContractAddress = '0xBbba073C31bF03b8ACf7c28EF0738DeCF3695683';
  } else {
    // hre.network.name === 'mumbai'
    sandContractAddress = '0x592daadC9eA7F56A81De1FD27A723Bd407709c46';
    metadataUrl =
      'https://contracts-demo.sandbox.game/avatarcollection-unrevealed/';
  }

  // OpenSea configurations // // //
  // defaultOperatorFiltererRegistry (taken from named accounts): address of registry
  // defaultOperatorFiltererSubscription (taken from named accounts): address of filter subscription
  const operatorFiltererSubscriptionSubscribe = true; // if to actually subscribe or just copy

  // default values used for minting setups // // //
  const mintPrice = ethers.parseUnits('100', 'ether');
  const maxPublicTokensPerWallet = 4;
  const maxAllowlistTokensPerWallet = 2;

  // references to implementation
  const implementationAlias = ethers.encodeBytes32String('main-avatar');
  const implementationContractName = 'AvatarCollection';

  // check if particular collection was already deployed, if yes, will not deploy again
  if (skipIfAlreadyDeployed) {
    console.log(
      'skipIfAlreadyDeployed is true: checking if collection, ' +
        `${collectionName} was already deployed`
    );
    try {
      const deploymentFile = await deployments.get(collectionName);
      console.log(`Deployment file already exists for ${collectionName}`);
      console.log(`reusing ${collectionName} at ${deploymentFile.address}`);
      return;
    } catch (e) {
      const errorMessage: string = (e as Error).message;
      console.log(errorMessage);
      console.log('Continuing with deployment');
    }
  }
  const avatarCollectionImplementationContract = await deployments.get(
    implementationContractName
  );
  // encode arguments to be used as initialize data for the collection
  const implementationContract = await ethers.getContractAt(
    implementationContractName,
    avatarCollectionImplementationContract.address
  );
  const encodedInitializationArgs =
    implementationContract.interface.encodeFunctionData('initialize', [
      nftCollectionAdmin,
      metadataUrl,
      collectionName,
      collectionSymbol,
      treasury,
      raffleSignWallet,
      TRUSTED_FORWARDER.address,
      // sandContract.address,
      sandContractAddress,
      MAX_SUPPLY,
      [
        defaultOperatorFiltererRegistry,
        defaultOperatorFiltererSubscription,
        operatorFiltererSubscriptionSubscribe,
      ],
      [
        mintPrice,
        maxPublicTokensPerWallet,
        maxAllowlistTokensPerWallet,
        maxMarketingTokens,
      ],
    ]);

  console.log(`encodedInitializationArgs:`, encodedInitializationArgs);
  const owner = await deployments.read('CollectionFactory', 'owner');
  const factoryContractAsOwner = await ethers.getContractAt(
    'CollectionFactory',
    owner
  );

  console.log(`deploying "${collectionName}" ...`);
  const deployTx = await factoryContractAsOwner.deployCollection(
    implementationAlias,
    encodedInitializationArgs
  );
  await deployTx.wait(); // a must

  // for now, the last CollectionAdded is taken. If this is not ok, will use a TX parser
  const collectionAddedEvents = await factoryContractAsOwner.queryFilter(
    factoryContractAsOwner.filters.CollectionAdded()
  );
  if (!collectionAddedEvents.length) {
    console.log(
      'No deployment event happened, check transaction for issue:',
      deployTx.hash
    );
    return;
  }
  const collectionAddress = collectionAddedEvents.slice(-1)[0].args?.[1];

  console.log(`deployed at ${collectionAddress} (tx: ${deployTx.hash})`);

  // save collection proxy in deployments
  const collectionProxyDeploymentsName = `${collectionName}Proxy`; // `<CollectionName>Proxy`
  const collectionProxyInterface = await artifacts.readArtifact(
    'CollectionProxy'
  );
  await deployments.save(collectionProxyDeploymentsName, {
    address: collectionAddress,
    abi: collectionProxyInterface.abi,
  });

  // save collection address as implementation (even though it is through a proxy)
  // warning, if beacon is changed or implementation of beacon is changed then these address is still ok
  // but the ABI, on chain, will be of the new implementation. Manually save it in deployment
  const implementationInterface = await artifacts.readArtifact(
    implementationContractName
  );
  await deployments.save(collectionName, {
    address: collectionAddress,
    abi: implementationInterface.abi,
  });

  // sanity check
  const collectionProxyContract = await deployments.get(collectionName);
  console.log(
    'Newly launched collection (proxy):',
    collectionProxyContract.address
  );
};

export default func;
func.tags = [
  'AvatarCollectionTest',
  'AvatarCollectionTest_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'PolygonSand_deploy',
  'CollectionFactory_deploy_beacon_main_avatar',
  'TRUSTED_FORWARDER_V2',
];
