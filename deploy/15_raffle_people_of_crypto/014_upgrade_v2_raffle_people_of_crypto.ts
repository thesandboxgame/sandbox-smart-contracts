import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {
    deployer,
    upgradeAdmin,
  } = await getNamedAccounts();

  await deploy('RafflePeopleOfCrypto', {
    from: deployer,
    contract: 'PeopleOfCryptoV3',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1,
    },
    log: true,
  });
};

export default func;
func.tags = ['RafflePeopleOfCrypto', 'RafflePeopleOfCryptoV2_deploy'];
func.runAtTheEnd = true;
func.dependencies = [
  'RafflePeopleOfCrypto_deploy'
];
