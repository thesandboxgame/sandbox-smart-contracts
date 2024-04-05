import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const multigiveaways = [1];

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, multiGiveawayAdmin} = await getNamedAccounts();

  const TRUSTED_FORWARDER_V2 = await deployments.getOrNull(
    'TRUSTED_FORWARDER_V2'
  );

  const adminByNetwork: {
    [n: number]: {[name: string]: string | undefined; default: string};
  } = {
    1: {
      default: deployer,
      mainnet: multiGiveawayAdmin,
      polygon: multiGiveawayAdmin,
    },
    2: {
      default: deployer,
      mainnet: '0x2e0405eaC370F83d6A0085D69F77C37dAf8d901F',
      polygon: '0x44baA6A480401717ed72762958eE2742b47F8b77',
    },
  };

  for (const n of multigiveaways) {
    await deploy(`PolygonMulti_Giveaway_${n}`, {
      contract: 'MultiGiveaway',
      from: deployer,
      log: true,
      skipIfAlreadyDeployed: true,
      args: [
        adminByNetwork[n][hre.network.name] || adminByNetwork[n].default,
        TRUSTED_FORWARDER_V2?.address ||
          '0x0000000000000000000000000000000000000000',
      ], // admin, trustedForwarder
    });
  }
};

export default func;
func.tags = [
  'PolygonMulti_Giveaway',
  'PolygonMulti_Giveaway_deploy',
  // Legacy deployment tag
  'PolygonMulti_Giveaway_1',
];
