import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, sandAdmin} = await getNamedAccounts();

  // Get the PolygonSand contract address
  const sandContract = await deployments.get('PolygonSand');

  console.log(
    'Deploying PurchaseWrapper with Sand contract address:',
    sandContract.address
  );
  console.log('Deployer address:', deployer);

  const TRANSAK_WALLET = '0xcb9bd5acd627e8fccf9eb8d4ba72aeb1cd8ff5ef'; // AMOY

  await deployments.deploy('PurchaseWrapper', {
    from: deployer,
    contract:
      '@sandbox-smart-contracts/avatar/contracts/nft-collection/PurchaseWrapper.sol:PurchaseWrapper',
    args: [sandAdmin, sandContract.address, TRANSAK_WALLET],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};

export default func;
func.tags = [
  'PurchaseWrapper',
  'PurchaseWrapper_deploy',
  'PolygonNFTCollection',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['PolygonSand_deploy'];
