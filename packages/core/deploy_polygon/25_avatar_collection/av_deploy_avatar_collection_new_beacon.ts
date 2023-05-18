import {DeployFunction, ABI} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {
    deployer,
    sandAdmin,
    raffleSignWallet,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    nftCollectionAdmin,
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');

  let metadataUrl;
  if (hre.network.name === 'polygon') {
    metadataUrl = 'https://contracts.sandbox.game/unrevealed/';
  } else {
    metadataUrl = 'https://contracts-demo.sandbox.game/unrevealed/';
  }

  const implementationContractName = 'AvatarCollection';

  // deploying the implementation
  await deployments.deploy(implementationContractName, {
    from: deployer,
    contract: implementationContractName,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  // setup arguments
  const sandContract = await deployments.get('PolygonSand');

  const filterParams = {
    defaultOperatorFiltererRegistry: defaultOperatorFiltererRegistry,
    operatorFiltererSubscription: defaultOperatorFiltererSubscription,
    operatorFiltererSubscriptionSubscribe: true,
  };

  const mintingDefaults = {
    mintPrice: 1,
    maxPublicTokensPerWallet: 4,
    maxAllowlistTokensPerWallet: 2,
    maxMarketingTokens: 100,
  };

  const avatarCollectionImplementationContract = await ethers.getContract(
    implementationContractName
  );

  // encode arguments to be used as initialize data for the collection
  const encodedInitializationArgs = avatarCollectionImplementationContract.interface.encodeFunctionData(
    'initialize',
    [
      nftCollectionAdmin,
      metadataUrl,
      'AvatarCollection',
      `AVTC`,
      sandAdmin,
      raffleSignWallet,
      TRUSTED_FORWARDER.address,
      sandContract.address,
      500,
      [
        filterParams.defaultOperatorFiltererRegistry,
        filterParams.operatorFiltererSubscription,
        filterParams.operatorFiltererSubscriptionSubscribe,
      ],
      [
        mintingDefaults.mintPrice,
        mintingDefaults.maxPublicTokensPerWallet,
        mintingDefaults.maxAllowlistTokensPerWallet,
        mintingDefaults.maxMarketingTokens,
      ],
    ]
  );

  const owner = await deployments.read('CollectionFactory', 'owner');
  const factoryContractAsOwner = await ethers.getContract(
    'CollectionFactory',
    owner
  );

  console.log('CollectionFactory:', factoryContractAsOwner.address);
  console.log('CollectionFactory owner:', owner);

  const implementationAlias = ethers.utils.formatBytes32String('main-avatar');

  // deploying beacon
  const deployBeaconTx = await factoryContractAsOwner.deployBeacon(
    avatarCollectionImplementationContract.address,
    implementationAlias
  );

  const deployBeaconTxResult = await deployBeaconTx.wait(); // 0ms, as tx is already confirmed
  const event = deployBeaconTxResult.events.find(
    (event: {event: string}) => event.event === 'BeaconAdded'
  );

  const [, beaconAddress] = event.args;

  console.log('Newly launched beacon:', beaconAddress);

  const deployCollectionTx = await factoryContractAsOwner.deployCollection(
    implementationAlias,
    encodedInitializationArgs
  );

  const deployCollectionTxResult = await deployCollectionTx.wait();

  const collectionAddedEvent = deployCollectionTxResult.events.find(
    (event: {event: string}) => event.event === 'CollectionAdded'
  );

  const [, collectionAddress] = collectionAddedEvent.args;

  await deployments.save(`${implementationContractName}Proxy`, {
    address: collectionAddress,
    abi: (JSON.stringify(
      avatarCollectionImplementationContract.interface
    ) as unknown) as ABI,
  });
  const collectionProxyContract = await deployments.get(
    `${implementationContractName}Proxy`
  );

  console.log(
    'Newly launched collection (proxy):',
    collectionProxyContract.address
  ); // or collectionAddress
};

export default func;
func.tags = ['AvatarCollection', 'AvatarCollection_deploy_new_beacon'];
func.dependencies = [
  'PolygonSand_deploy',
  'CollectionFactory_deploy',
  'TRUSTED_FORWARDER_V2',
];
