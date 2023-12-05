import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    /* upgradeAdmin, */ treasury,
    raffleSignWallet,
  } = await getNamedAccounts();

  let metadataUrl;
  if (hre.network.name === 'mainnet') {
    metadataUrl = 'https://www.sandbox.game/snoopdogg/unrevealed.json?tokenId=';
  } else {
    metadataUrl = 'https://api-demo.sandbox.game/collections/26/metadata/';
  }

  await deploy('RaffleTheDoggies', {
    from: deployer,
    contract: 'Raffle',
    args: [metadataUrl, 'The Doggies', 'TD', treasury, raffleSignWallet],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['RaffleTheDoggies', 'RaffleTheDoggies_deploy'];
