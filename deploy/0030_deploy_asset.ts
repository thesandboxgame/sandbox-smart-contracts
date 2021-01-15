import {HardhatRuntimeEnvironment} from 'hardhat/types';
import fs from 'fs-extra';
import {
  DeployFunction,
  DeploymentSubmission,
  DeployedContract,
} from 'hardhat-deploy/types';
import {Contract} from 'ethers';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, getChainId, upgrades, ethers} = hre;
  const {deploy, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const sandContract = await deployments.get('Sand');
  const Asset = await ethers.getContractFactory('Asset');

  const asset = await upgrades.deployProxy(
    Asset,
    [sandContract.address, deployer, deployer],
    {initializer: 'init', unsafeAllowCustomTypes: false}
  );
  await asset.deployed();

  const networkFile = JSON.parse(
    fs
      .readFileSync(`.openzeppelin/unknown-${await getChainId()}.json`)
      .toString()
  );

  const proxyAdminAddress = networkFile.admin.address;

  const assetAsDeployment: DeploymentSubmission = {
    address: asset.address,
    abi: hre.artifacts.readArtifactSync('Asset').abi,
    // @note need to get the metadata
    // TODO metadata + other info
  };

  // @note this saves the proxy address
  await deployments.save('Asset', assetAsDeployment);

  // TODO:
  // await deployments.save('Asset_Proxy', assetProxy);
  // await deployments.save('Asset_Implementation', assetImplementation);
  // await deployments.save('Asset_ProxyAdmin', assetImplementation);

  console.log('Asset Proxy deployed to:', asset.address);
  console.log('Proxy Admin Contract deployed to:', proxyAdminAddress);
};

export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Sand', 'Sand_deploy'];
