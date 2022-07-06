import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute} = deployments;

  const {deployer, upgradeAdmin} = await getNamedAccounts();

  if (upgradeAdmin.toLowerCase() !== deployer.toLowerCase()) {
    await catchUnknownSigner(
      execute(
        'RafflePeopleOfCrypto',
        {from: upgradeAdmin, log: true},
        'changeAdmin',
        deployer
      )
    );
  }
};

export default func;
func.tags = ['RafflePeopleOfCrypto_change_admin'];
func.dependencies = [
  'RafflePeopleOfCrypto_deploy',
  'RafflePeopleOfCrypto_setup_minter',
  'RafflePeopleOfCrypto_setup_wave',
];
