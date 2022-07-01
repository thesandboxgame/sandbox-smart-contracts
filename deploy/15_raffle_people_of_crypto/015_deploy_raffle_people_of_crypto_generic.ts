import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function(hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const {deployer, upgradeAdmin} = await getNamedAccounts();

  await deploy('RafflePeopleOfCrypto', {
    from: deployer,
    contract: 'PeopleOfCryptoGeneric',
    proxy: {
      owner: upgradeAdmin,
      proxyContract: 'OpenZeppelinTransparentProxy',
      upgradeIndex: 1
    },
    log: true
  });
};

export default func;
func.tags = ['RafflePeopleOfCrypto', 'RafflePeopleOfCryptoGeneric_deploy'];
func.dependencies = ['RafflePeopleOfCrypto_deploy'];
