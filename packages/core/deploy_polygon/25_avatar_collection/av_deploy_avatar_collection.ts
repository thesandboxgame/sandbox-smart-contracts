import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
// import {ethers} from 'hardhat';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {deploy, read, get, execute, catchUnknownSigner} = deployments;
  const {
    deployer,
    sandAdmin,
    raffleSignWallet,
    defaultOperatorFiltererRegistry,
    defaultOperatorFiltererSubscription,
    nftCollectionAdmin
  } = await getNamedAccounts();

  const TRUSTED_FORWARDER = await get('TRUSTED_FORWARDER_V2');

  let metadataUrl;
  if (hre.network.name === 'polygon') {
    metadataUrl =
      'https://contracts.sandbox.game/unrevealed/';
  } else {
    metadataUrl =
      'https://contracts-demo.sandbox.game/unrevealed/';
  }

  const contractName = 'AvatarCollection';
  await deploy(contractName, {
    from: deployer,
    contract: contractName,
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const avatarCollectionImplementationContract = await ethers.getContract(contractName);

  const sandContract = await get('PolygonSand');

  const filterParams = {
    defaultOperatorFiltererRegistry: defaultOperatorFiltererRegistry,
    operatorFiltererSubscription: defaultOperatorFiltererSubscription,
    operatorFiltererSubscriptionSubscribe: true
  }

  const mintingDefaults = {
    mintPrice: 1,
    maxPublicTokensPerWallet: 4,
    maxAllowlistTokensPerWallet: 2,
    maxMarketingTokens: 100
  }

  // const encodedInitializationArgs = ethers.utils.defaultAbiCoder.encode(
  //   [
  //     'address', 'string', 'string', 'string', 'address', 'address', 'address', 'address', 'uint256',
  //     'tuple(address, address, bool)',  // filterParams
  //     'tuple(uint256, uint256, uint256, uint256)' // mintingDefaults
  //   ],
  const encodedInitializationArgs = avatarCollectionImplementationContract.interface.encodeFunctionData('initialize',
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
        filterParams.operatorFiltererSubscriptionSubscribe
      ],
      [
        mintingDefaults.mintPrice,
        mintingDefaults.maxPublicTokensPerWallet,
        mintingDefaults.maxAllowlistTokensPerWallet,
        mintingDefaults.maxMarketingTokens
      ]
    ]
  );
  // console.log(encodedInitializationArgs);

  const factoryContract = await get('CollectionFactory');
  const owner = await read('CollectionFactory', 'owner');

  console.log("CollectionFactory:", factoryContract.address);
  console.log("CollectionFactory owner:", owner);

  const mainImplementationAlias = ethers.utils.formatBytes32String("main-avatar");

  const mainAvatarBeacon = await execute(
      'CollectionFactory',
      {from: owner, log: true},
      'deployBeacon',
      avatarCollectionImplementationContract.address,
      mainImplementationAlias
    );

  //const contractInstance = await ethers.getContractAt("contracts/XYZ.sol:ContractName", contractAddress);

  const collectionRes = await execute(
      'CollectionFactory',
      {from: owner, log: true},
      'deployCollection',
      mainImplementationAlias,
      encodedInitializationArgs
    );

    // console.log("collectionAddress: ");
    // console.log(collectionRes.events);

};

export default func;
func.tags = ['AvatarCollection', 'AvatarCollection_deploy'];
func.dependencies = ['PolygonSand_deploy', 'CollectionFactory_deploy', 'TRUSTED_FORWARDER_V2'];
