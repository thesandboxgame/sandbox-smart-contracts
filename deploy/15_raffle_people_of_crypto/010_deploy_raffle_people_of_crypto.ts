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
    metadataUrl =
      'https://www.sandbox.game/peopleofcrypto/unrevealed.json?tokenId=';
  } else {
    metadataUrl = 'https://api-demo.sandbox.game/collections/35/metadata/';
  }

  await deploy('RafflePeopleOfCrypto', {
    from: deployer,
    contract: 'PeopleOfCrypto',
    args: [metadataUrl, 'People Of Crypto', 'POC', treasury, raffleSignWallet],
    log: true,
    skipIfAlreadyDeployed: true,
  });
};
export default func;
func.tags = ['RafflePeopleOfCrypto', 'RafflePeopleOfCrypto_deploy'];
