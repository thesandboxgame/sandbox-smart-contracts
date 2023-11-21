import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

export const royaltyAmount = 500;

const func: DeployFunction = async function (
  hre: HardhatRuntimeEnvironment
): Promise<void> {
  const {deployments, getNamedAccounts} = hre;
  const {execute, read, catchUnknownSigner, log} = deployments;
  const {contractRoyaltySetter} = await getNamedAccounts();

  // set catalyst on Royalty Manager
  const catalyst = await deployments.get('Catalyst');

  if (
    (await read(
      'RoyaltyManager',
      {from: contractRoyaltySetter},
      'contractRoyalty',
      catalyst.address
    )) !== royaltyAmount
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
