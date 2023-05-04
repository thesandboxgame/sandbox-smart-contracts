import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {deployer} = await getNamedAccounts();

  const owner = await read('RafflePeopleOfCrypto', 'owner');

  if (deployer?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'RafflePeopleOfCrypto',
        {from: owner, log: true},
        'transferOwnership',
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
