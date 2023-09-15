import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

// TODO this should not be hardcoded here
export const royaltyAmount = 500;

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner, log} = deployments;
  const {catalystAdmin, contractRoyaltySetter} = await getNamedAccounts();

  // TODO Remove below before mainnet deployment
  const minterRole = await read('Catalyst', 'MINTER_ROLE');
  if (
    !(await read(
      'Catalyst',
      'hasRole',
      minterRole,
      '0xf41671100948bcb80CB9eFbD3fba16c2898d9ef7' // Seba's mumbai wallet
    ))
  ) {
    await catchUnknownSigner(
      execute(
        'Catalyst',
        {from: catalystAdmin, log: true},
        'grantRole',
        minterRole,
        '0xf41671100948bcb80CB9eFbD3fba16c2898d9ef7' // Seba's mumbai wallet
      )
    );
    log(`MINTER_ROLE granted to 0xf41671100948bcb80CB9eFbD3fba16c2898d9ef7`);
  }
  // TODO END

  // set catalyst on Royalty Manager
  const catalyst = await deployments.get('Catalyst');

  if (
    (await read(
      'RoyaltyManager',
      {from: contractRoyaltySetter},
      'contractRoyalty',
      catalyst.address
    )) === 0
  ) {
    await catchUnknownSigner(
      execute(
        'RoyaltyManager',
        {from: contractRoyaltySetter, log: true},
        'setContractRoyalty',
        catalyst.address,
        royaltyAmount
      )
    );
    log(`Catalyst set on RoyaltyManager with ${royaltyAmount} BPS royalty`);
  }
};

export default func;
func.tags = ['Catalyst', 'Catalyst_setup', 'L2'];
func.dependencies = ['Catalyst_deploy', 'RoyaltyManager_deploy'];
