import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export const CATALYST_BASE_URI = "ipfs://";
export const CATALYST_DEFAULT_ROYALTY = 100;

// TODO: update for polygon-mainnet deployment
export const CATALYST_IPFS_CID_PER_TIER = [
  "QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L",
  "QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L",
  "QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L",
  "QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L",
  "QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L",
  "QmZEhV6rMsZfNyAmNKrWuN965xaidZ8r5nd2XkZq9yZ95L",
];

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;
  
    const {
      deployer,
      upgradeAdmin,
      catalystMinter,
      catalystAdmin,
      catalystAssetFeeRecipient, // royalty recipient
    } = await getNamedAccounts();

    const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
    const OperatorFilterSubscription = await deployments.get(
      "OperatorFilterRegistrant"
    );
  
    await deploy("Catalyst", {
      from: deployer,
      log: true,
      contract: "@sandbox-smart-contracts/asset/contracts/Catalyst.sol:Catalyst",
      proxy: {
        owner: upgradeAdmin,
        proxyContract: "OpenZeppelinTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [
            CATALYST_BASE_URI,
            TRUSTED_FORWARDER.address,
            catalystAssetFeeRecipient, // royalty recipient
            OperatorFilterSubscription.address,
            catalystAdmin, // DEFAULT_ADMIN_ROLE
            catalystMinter, // MINTER_ROLE
            CATALYST_DEFAULT_ROYALTY,
            CATALYST_IPFS_CID_PER_TIER,
          ],
        },
        upgradeIndex: 0,
      },
      skipIfAlreadyDeployed: true,
    });
  };
  export default func;
  func.tags = ["Catalyst", 'Catalyst_deploy', "L2"];
  func.dependencies = ["OperatorFilterRegistrant", "TRUSTED_FORWARDER_V2"];