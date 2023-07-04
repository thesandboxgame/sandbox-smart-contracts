import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner, log} = deployments;
  const {catalystAdmin} = await getNamedAccounts();
  const minterRole = await read('Catalyst', 'MINTER_ROLE');
  if (
    !(await read(
      'Catalyst',
      'hasRole',
      minterRole,
      '0x803E1522e136121c058dc9541E7B3164957c200e' // Seba's mumbai wallet
    ))
  ) {
    await catchUnknownSigner(
      execute(
        'Catalyst',
        {from: catalystAdmin, log: true},
        'grantRole',
        minterRole,
        '0x803E1522e136121c058dc9541E7B3164957c200e' // Seba's mumbai wallet
      )
    );
    log(`MINTER_ROLE granted to 0x803E1522e136121c058dc9541E7B3164957c200e`);
  }
};

export default func;
func.tags = ['Catalyst', 'Catalyst_role_setup', 'L2'];
func.dependencies = ['Catalyst_deploy'];
