import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {saveDeployment} from '../../utils/hardhatDeployUtils';

// TO BE USED ONLY ON TEST NETS!!!
// Collections are created via backoffice, this script creates a testing collection
// hardhat-deploy don't support factory and beacons the way we use them
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts, ethers} = hre;
  const {treasury, raffleSignWallet, nftCollectionAdmin} =
    await getNamedAccounts();

  // TODO: set the right arguments
  const metadataUrl =
    'https://contracts.sandbox.game/avatarcollection-unrevealed/';
  const collectionName = 'NFTCollectionTest';
  const collectionSymbol = 'TEST';
  const MAX_SUPPLY = 500;

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const sandContract = await deployments.get('PolygonSand');
  const implementation = await ethers.getContract(
    'NFTCollection_Implementation'
  );
  const beaconAlias = ethers.encodeBytes32String('nft-collection-v2');
  const beaconAddress = await deployments.read(
    'CollectionFactory',
    'aliasToBeacon',
    beaconAlias
  );
  await saveDeployment(
    deployments,
    '0xFA0Ff3F8fc0F4d8f51eC8fe813f029d1f6627F76',
    'NFTCollectionMat_Proxy',
    '@sandbox-smart-contracts/avatar/contracts/proxy/CollectionProxy.sol:CollectionProxy',
    undefined,
    undefined,
    [
      beaconAddress,
      implementation.interface.encodeFunctionData('initialize', [
        nftCollectionAdmin,
        metadataUrl,
        collectionName,
        collectionSymbol,
        treasury,
        raffleSignWallet,
        TRUSTED_FORWARDER.address,
        sandContract.address,
        MAX_SUPPLY,
      ]),
    ]
  );
};

export default func;
func.tags = ['PolygonNFTCollectionTest_Save'];
