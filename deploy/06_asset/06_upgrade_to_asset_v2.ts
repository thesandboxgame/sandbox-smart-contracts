import {HardhatRuntimeEnvironment} from 'hardhat/types';
import fs from 'fs-extra';
import {DeployFunction, DeploymentSubmission} from 'hardhat-deploy/types';
import {BigNumber} from '@ethersproject/bignumber';
import {getAddress} from '@ethersproject/address';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts, getChainId, upgrades, ethers} = hre;
  const {deployer, assetBouncerAdmin, assetAdmin} = await getNamedAccounts();
  const {log, execute} = deployments;

  const chainId = await getChainId();
  const forwarder = await deployments.get('TestMetaTxForwarder');

  const proxy = await deployments.get('Asset');

  console.log(`proxy address: ${proxy.address}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AssetV2 = await (ethers as any).getContractFactory('AssetV2', deployer); // TODO check types with hardhat-ethers and hardhat-deploy-ethers, for now use `any`

  const asset = await upgrades.upgradeProxy(proxy.address, AssetV2, {
    unsafeAllowCustomTypes: false,
  });
  await asset.deployed();
  console.log('Asset upgraded to AssetV2');

  const implementationStorage = await ethers.provider.getStorageAt(
    asset.address,
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
  );
  const implementationAddress = getAddress(
    BigNumber.from(implementationStorage).toHexString()
  );

  log(
    `AssetV2 deployed as Proxy at : ${asset.address}, implementation: ${implementationAddress}`
  );

  const AssetArtifact = await deployments.getExtendedArtifact('AssetV2');
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
        openzeppelinNetworkName = 'mainnet';
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
  // class Minter {
  //   minter: string;
  //   allowedToMint: boolean;
  //   constructor(address: string, allowed: boolean) {
  //     this.minter = address;
  //     this.allowedToMint = allowed;
  //   }
  // }

  // for hardhat-network testing we set some simple EOA minters as expected by tests:
  // const dummyMinter = otherAccounts[0];
  // const dummyMinter1 = otherAccounts[1];

  // async function getNetworkMinters(chain: string): Promise<Minter[]> {
  //   const minterArray: Minter[] = [];
  //   let allowed: boolean[];
  //   let addresses: string[];

  //   if (chain == '31337') {
  //     addresses = [assetMinter.address, dummyMinter, dummyMinter1];
  //     allowed = [true, true, true];
  //     for (let i = 0; i < addresses.length; i++) {
  //       minterArray.push(new Minter(addresses[i], allowed[i]));
  //     }
  //   } else {
  //     addresses = [assetMinter.address];
  //     allowed = [true];
  //     for (let i = 0; i < addresses.length; i++) {
  //       minterArray.push(new Minter(addresses[i], allowed[i]));
  //     }
  //   }
  //   return minterArray;
  // }

  // const networkMinters = await getNetworkMinters(chainId);

  // @review move to set/init script ?
  // possible to use ProxyAdmin.upgradeToAndCall() to perform upgrade + init in 1 tx ?
  await execute(
    'Asset',
    {from: assetBouncerAdmin, log: true},
    'initV2',
    forwarder.address,
    assetAdmin,
    assetBouncerAdmin
  );
};

export default func;
func.tags = ['AssetV2', 'AssetV2_deploy'];
func.runAtTheEnd = true;
func.dependencies = [
  'Asset_deploy',
  'Asset_setup',
  'AssetMinter_deploy',
  'TestMetaTxForwarder_deploy',
  'GameToken_setup',
];
func.skip = async (hre) => hre.network.name !== 'hardhat';
