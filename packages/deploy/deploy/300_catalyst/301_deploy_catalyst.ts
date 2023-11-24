import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export const CATALYST_BASE_URI = 'ipfs://';

export const CATALYST_IPFS_CID_PER_TIER = [
  'bafkreif4mtjrhrggjpigtsbghsuzr3sf6l7kgz6xsjdmiskc3fxktdyw3m', // Universal
  'bafkreieg56vikzi3kq3dqrrdjgetx6zf32btyh2f3gto3x6252yyqxzt4i', // Common
  'bafkreidh2ar2he4gynkmelfwreu66v6il5ttxnzvfwpjblk63qg7nzelhy', // Uncommon
  'bafkreifipzgz26f54wbmtcf6w2t2cy54nszys64vah7lnppf2v3am2spkm', // Rare
  'bafkreihjwavnyuyzoiynzqul6b3ssfmydwfgjzokj6hmsv54gxsylfmpvq', // Epic
  'bafkreie5ye6ttf6e5v34rgpovkp4xontsu5gtel4xjmaqadjao5hu3klzm', // Legendary
  'bafkreidzh2gvadeuvw4x4xdgrb6uhkyfgn4sk5d47hffro6lrrapjcajn4', // Mythic
];

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('Catalyst', {
    from: deployer,
    log: true,
    contract: '@sandbox-smart-contracts/asset/contracts/Catalyst.sol:Catalyst',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      methodName: 'reinitialize',
      upgradeIndex: 1,
    },
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['Catalyst', 'Catalyst_deploy', 'L2'];
func.dependencies = [
  'OperatorFilterCatalystSubscription_deploy',
  'RoyaltyManager_deploy',
  'TRUSTED_FORWARDER_V2',
];
