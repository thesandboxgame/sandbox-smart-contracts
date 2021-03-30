import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deployer, assetBouncerAdmin, assetAdmin} = await getNamedAccounts();
  const {deploy} = deployments;

  const forwarder = await deployments.get('TestMetaTxForwarder');

  /**
  const {deployments, getNamedAccounts, getChainId} = hre;
  const chainId = await getChainId();

  class Minter {
    minter: string;
    allowedToMint: boolean;
    constructor(address: string, allowed: boolean) {
      this.minter = address;
      this.allowedToMint = allowed;
    }
  }

  for hardhat-network testing we set some simple EOA minters as expected by tests:
  const dummyMinter = otherAccounts[0];
  const dummyMinter1 = otherAccounts[1];

  async function getNetworkMinters(chain: string): Promise<Minter[]> {
    const minterArray: Minter[] = [];
    let allowed: boolean[];
    let addresses: string[];

    if (chain == '31337') {
      addresses = [assetMinter.address, dummyMinter, dummyMinter1];
      allowed = [true, true, true];
      for (let i = 0; i < addresses.length; i++) {
        minterArray.push(new Minter(addresses[i], allowed[i]));
      }
    } else {
      addresses = [assetMinter.address];
      allowed = [true];
      for (let i = 0; i < addresses.length; i++) {
        minterArray.push(new Minter(addresses[i], allowed[i]));
      }
    }
    return minterArray;
  }

  const networkMinters = await getNetworkMinters(chainId);


  */
  await deploy('Asset', {
    from: deployer,
    contract: 'AssetV2',
    args: [forwarder.address, assetAdmin, assetBouncerAdmin],
    proxy: {
      owner: deployer,
      proxyContract: 'OpenZeppelinTransparentProxy',
      methodName: 'initV2',
    },
    log: true,
  });

  console.log('Asset upgraded to AssetV2');
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
