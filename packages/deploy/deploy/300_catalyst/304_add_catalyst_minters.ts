import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, read, execute, log} = deployments;

  const {sandAdmin} = await getNamedAccounts();
  const addressToAdd = '0x5713ABb7Ac6aB45448949c66eFC033594F5dEbD1'; // Ioana Amoy

  const catalystMinterRole = await read('Catalyst', 'MINTER_ROLE');

  if (!(await read('Catalyst', 'hasRole', addressToAdd))) {
    await catchUnknownSigner(
      execute(
        'Catalyst',
        {from: sandAdmin, log: true},
        'grantRole',
        catalystMinterRole, // role
        addressToAdd // address
      )
    );
    log(`Address ${addressToAdd} granted MINTER_ROLE`);
  }
};
export default func;
func.tags = ['Catalyst_minters', 'L2'];
func.dependencies = ['Catalyst_deploy', 'Catalyst_setup', 'Catalyst_upgrade'];
