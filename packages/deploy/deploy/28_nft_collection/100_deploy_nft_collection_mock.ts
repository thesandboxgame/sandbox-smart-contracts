import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';
import {
  getEventArgsFromReceipt,
  saveDeployment,
} from '../../utils/hardhatDeployUtils';

// TO BE USED ONLY ON TEST NETS!!!
// Collections are created via backoffice, this script creates a testing collection
// hardhat-deploy don't support factory and beacons the way we use them
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;

  const skipIfAlreadyExists = !!(await deployments.getOrNull(
    'NFTCollection_CollectionProxy'
  ));
  if (skipIfAlreadyExists) {
    console.log('skip NFTCollection_CollectionProxy already exist');
    return;
  }
  const {treasury, raffleSignWallet, nftCollectionAdmin} =
    await getNamedAccounts();

  // TODO: set the right arguments
  const metadataUrl =
    'https://contracts.sandbox.game/avatarcollection-unrevealed/';
  const collectionName = 'NFTCollectionTest';
  const collectionSymbol = 'TEST';
  const MAX_SUPPLY = 500;
  const MAX_TOKENS_PER_WALLET = 2;

  const SandboxForwarder = await deployments.get('SandboxForwarder');
  const sandContract = await deployments.get('PolygonSand');
  const implementation = await ethers.getContract(
    'NFTCollection_Implementation'
  );
  const encodedConstructorArgs = implementation.interface.encodeFunctionData(
    'initialize',
    [
      [
        nftCollectionAdmin,
        metadataUrl,
        collectionName,
        collectionSymbol,
        treasury,
        raffleSignWallet,
        SandboxForwarder.address,
        sandContract.address,
        MAX_SUPPLY,
        MAX_TOKENS_PER_WALLET,
      ],
    ]
  );
  await deployments.catchUnknownSigner(async () => {
    const receipt = await deployments.execute(
      'CollectionFactory',
      {from: nftCollectionAdmin, log: true},
      'deployCollection',
      ethers.encodeBytes32String('nft-collection-v2'),
      encodedConstructorArgs
    );
    const eventArgs: {collectionProxy: string; beaconAddress: string} =
      getEventArgsFromReceipt(
        await ethers.getContract('CollectionFactory'),
        receipt,
        'CollectionAdded'
      );
    await saveDeployment(
      deployments,
      eventArgs.collectionProxy,
      'NFTCollectionMat_Proxy',
      '@sandbox-smart-contracts/avatar/contracts/proxy/CollectionProxy.sol:CollectionProxy',
      receipt,
      await implementation.getAddress(),
      [eventArgs.beaconAddress, encodedConstructorArgs]
    );
  });
};

export default func;
func.tags = [
  'PolygonNFTCollectionTest_deploy',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = [
  'PolygonNFTCollectionBeacon_deploy',
  'PolygonSand_deploy',
  'SandboxForwarder',
];
