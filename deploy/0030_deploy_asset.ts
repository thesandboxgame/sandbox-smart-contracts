import {HardhatRuntimeEnvironment} from 'hardhat/types';
import fs from 'fs-extra';
import {DeployFunction, DeploymentSubmission} from 'hardhat-deploy/types';
import {BigNumber} from '@ethersproject/bignumber';
import {getAddress} from '@ethersproject/address';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, getChainId, upgrades, ethers} = hre;
  const {deployer} = await getNamedAccounts();
  const {log} = deployments;

  const chainId = await getChainId();

  const sandContract = await deployments.get('Sand');

  const assetContract = await deployments.getOrNull('Asset');
  if (assetContract) {
    log(`Asset already deployed at ${assetContract.address}`);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Asset = await (ethers as any).getContractFactory('Asset', deployer); // TODO check types with hardhat-ethers and hardhat-deploy-ethers, for now use `any`

  // Problem : cannot use deterministic deployment with openzepelin proxies ?
  const asset = await upgrades.deployProxy(
    Asset,
    [sandContract.address, deployer, deployer],
    {initializer: 'init', unsafeAllowCustomTypes: false}
  );
  await asset.deployed();
  const implementationStorage = await ethers.provider.getStorageAt(
    asset.address,
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
  );
  const implementationAddress = getAddress(
    BigNumber.from(implementationStorage).toHexString()
  );

  log(
    `Asset deployed as Proxy at : ${asset.address}, implementation: ${implementationAddress}`
  );

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

  const assetImplementation = {
    address: implementationAddress,
    ...AssetArtifact,
    // TODO :transactionHash: transactionHash for Proxy deployment
    // args ?
    // linkedData ?
    // receipt?
    // libraries ?
  };
  await deployments.save('Asset_Implementation', assetImplementation);

  // TODO:
  // await deployments.save('Asset_Proxy', assetProxy); // How do we access the Proxy abi/metadata from openzepeelin. if openzeppelin lib do not provide it, we will need to fetch manually from hre artifacts
  // await deployments.save('Asset_ProxyAdmin', assetImplementation); // how do we access the Proxy abi/metadata from openzepeelin. if openzeppelin lib do not provide it, we will need to fetch manually from hre artifacts

  // --------------------------------------------------
  // Logging Proxy Admin
  // --------------------------------------------------
  try {
    // Problems:
    // - openzeppelin do not support multiple network name for same network chainId
    let openzeppelinNetworkName = `unknown-${chainId}`;
    switch (chainId) {
      case '4':
        openzeppelinNetworkName = 'rinkeby';
        break;
      case '1':
        openzeppelinNetworkName = 'mainnet'; // ???? TO CHECK
        break;
      // TODO more + move to lib
    }
    const openzeppelinFileName = `.openzeppelin/${openzeppelinNetworkName}.json`;
    const networkFile = JSON.parse(
      fs.readFileSync(openzeppelinFileName).toString()
    );
    const proxyAdminAddress = networkFile.admin.address;
    log('Proxy Admin Contract deployed to:', proxyAdminAddress);
  } catch (e) {
    console.error(e);
  }
};

export default func;
func.tags = ['Asset', 'Asset_deploy'];
func.dependencies = ['Sand', 'Sand_deploy'];
