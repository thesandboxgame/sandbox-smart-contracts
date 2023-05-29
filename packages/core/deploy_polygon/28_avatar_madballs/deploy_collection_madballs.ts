import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {BigNumber} from 'ethers';

// the same as `skipIfAlreadyDeployed` from deployments.deploy but applied to our on-chain logic
const skipIfAlreadyDeployed = false;

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers, artifacts} = hre;

  const {
    sandAdmin,
    raffleSignWallet,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    nftCollectionAdmin,
  } = await getNamedAccounts();

  // setup arguments
  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2'); // Metatransaction address
  const sandContract = await deployments.get('PolygonSand'); // allowedToExecuteMint address
  // raffleSignWallet (taken from name accounts): wallet that can sign
  // nftCollectionAdmin (taken from name accounts): owner of collection
  // sandAdmin (taken from name accounts): treasury
  const collectionName = 'MadBallsFactory';
  const collectionSymbol = 'MAD';
  const MAX_SUPPLY = 2023;

  let metadataUrl;
  if (hre.network.name === 'polygon') {
    metadataUrl = 'https://contracts.sandbox.game/madballs-unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/madballs-unrevealed/';
  }

  // OpenSea configurations // // //
  // defaultOperatorFiltererRegistry (taken from named accounts): address of registry
  // defaultOperatorFiltererSubscription (taken from named accounts): address of filter subscription
  const operatorFiltererSubscriptionSubscribe = true; // if to actually subscribe or just copy

  // default values used for minting setups // // //
  const mintPrice = BigNumber.from(100).mul('1000000000000000000');
  const maxPublicTokensPerWallet = 4;
  const maxAllowlistTokensPerWallet = 2;
  const maxMarketingTokens = 100;

  // references to implementation
  const implementationAlias = ethers.utils.formatBytes32String('main-avatar');
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

  // encode arguments to be used as initialize data for the collection
  const implementationContract = await ethers.getContract(
    implementationContractName
  );
  const encodedInitializationArgs = implementationContract.interface.encodeFunctionData(
    'initialize',
    [
      nftCollectionAdmin,
      metadataUrl,
      collectionName,
      collectionSymbol,
      sandAdmin,
      raffleSignWallet,
      TRUSTED_FORWARDER.address,
      sandContract.address,
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
    ]
  );

  const owner = await deployments.read('CollectionFactory', 'owner');
  const factoryContractAsOwner = await ethers.getContract(
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
func.tags = ['MadBallsFactory', 'MadBallsFactory_deploy'];
func.dependencies = [
  'PolygonSand_deploy',
  'CollectionFactory_deploy_beacon_main_avatar',
  'TRUSTED_FORWARDER_V2',
];
