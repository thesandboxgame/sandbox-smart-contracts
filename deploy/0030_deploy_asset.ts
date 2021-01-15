import {HardhatRuntimeEnvironment} from 'hardhat/types';
import fs from 'fs-extra';
import {DeployFunction, DeploymentSubmission} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, getChainId, upgrades, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const {log} = deployments;

  const sandContract = await deployments.get('Sand');

  const Asset = await (ethers as any).getContractFactory('Asset', deployer); // TODO check types with hardhat-ethers and hardhat-deploy-ethers
  const asset = await upgrades.deployProxy(
    Asset,
    [sandContract.address, deployer, deployer],
    {initializer: 'init', unsafeAllowCustomTypes: false}
  );
  await asset.deployed();

  // Questions :
  // Why is .openzeppelin file is called unknow ? What happen if multiple contract use proxy, is there one proxy admin for all ?
  // how do we get metadata for ProxyAdmin so we can verify it on any network we choose to deploy one
  // same for Proxy code
  const networkFile = JSON.parse(
    fs
      .readFileSync(`.openzeppelin/unknown-${await getChainId()}.json`)
      .toString()
  );
  const proxyAdminAddress = networkFile.admin.address;

  const AssetArtifact = await deployments.getExtendedArtifact('Asset');
  const assetAsDeployment: DeploymentSubmission = {
    address: asset.address,
    ...AssetArtifact,
    // TODO :transactionHash: transactionHash for Proxy deployment
    // args ?
    // linkedData ?
    // receipt?
    // libraries ?
  };
  await deployments.save('Asset', assetAsDeployment);

  // TODO perform the same for openzeppelin Proxy and ProxyAdmin

  // TODO:
  // await deployments.save('Asset_Proxy', assetProxy); // How do we access the Proxy abi/metadata from openzepeelin. if openzeppelin lib do not provide it, we will need to fetch manually from hre artifacts
  // await deployments.save('Asset_Implementation', assetImplementation); // how do we easily access the implementation address// we could fetch from Proxy via ProxyAdmin call
  // await deployments.save('Asset_ProxyAdmin', assetImplementation); // how do we access the Proxy abi/metadata from openzepeelin. if openzeppelin lib do not provide it, we will need to fetch manually from hre artifacts

  log('Asset Proxy deployed to:', asset.address);
  log('Proxy Admin Contract deployed to:', proxyAdminAddress);
};

export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Sand', 'Sand_deploy'];
