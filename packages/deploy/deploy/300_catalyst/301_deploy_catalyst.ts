import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export const CATALYST_BASE_URI = 'ipfs://';

// TODO: update for polygon-mainnet deployment
export const CATALYST_IPFS_CID_PER_TIER = [
  'bafkreib5tky3dgsc7zy637dfunb4zwwnpzo3w3i5tepbfee42eq3srwnwq',
  'bafkreiegevvim5q3ati4htsncxwsejfc3lbkzb7wn2a2fzthc6tsof7v7m',
  'bafkreifhtkou5a32xrtktdvfqrvgh4mp2ohvlyqdsih5xk4kgcfywtxefi',
  'bafkreigqpb7qo3iqka4243oah3nka6agx3nmvwzauxze2jznotx3zwozqe',
  'bafkreih3itsiwkn2urzfvg26mby3ssgfshvdr6zfabr6rxxrlzhedqil4e',
  'bafkreibmngauozzidz2eevyyb3umf2ew7zexing3ghup6l7io2ao522mvy',
];

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin, catalystMinter, catalystAdmin} =
    await getNamedAccounts();

  const TRUSTED_FORWARDER = await deployments.get('TRUSTED_FORWARDER_V2');
  const OperatorFilterSubscription = await deployments.get(
    'OperatorFilterSubscription'
  );
  const RoyaltyManager = await deployments.get('RoyaltyManager');

  await deploy('Catalyst', {
    from: deployer,
    log: true,
    contract: '@sandbox-smart-contracts/asset/contracts/Catalyst.sol:Catalyst',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      execute: {
        methodName: 'initialize',
        args: [
          CATALYST_BASE_URI,
          TRUSTED_FORWARDER.address,
          OperatorFilterSubscription.address,
          catalystAdmin, // DEFAULT_ADMIN_ROLE
          catalystMinter, // MINTER_ROLE
          CATALYST_IPFS_CID_PER_TIER,
          RoyaltyManager.address,
        ],
      },
      upgradeIndex: 0,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Catalyst', 'Catalyst_deploy', 'L2'];
func.dependencies = [
  'OperatorFilterSubscription_deploy',
  'RoyaltyManager_deploy',
  'TRUSTED_FORWARDER_V2',
];
