import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DEPLOY_TAGS} from '../../hardhat.config';

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
func.tags = [
  'Catalyst',
  'Catalyst_setup',
  DEPLOY_TAGS.L2,
  DEPLOY_TAGS.L2_PROD,
  DEPLOY_TAGS.L2_TEST,
];
func.dependencies = ['Catalyst_deploy', 'RoyaltyManager_deploy'];
