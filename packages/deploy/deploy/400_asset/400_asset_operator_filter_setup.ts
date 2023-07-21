import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
const DEFAULT_SUBSCRIPTION = '0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6';
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {filterOperatorSubscription} = await getNamedAccounts();
  const {execute, read} = deployments;

  const operatorFilterRegistry = await deployments.getOrNull(
    'OPERATOR_FILTER_REGISTRY'
  );

  if (operatorFilterRegistry) {
    const registered = await read(
      'OPERATOR_FILTER_REGISTRY',
      'isRegistered',
      filterOperatorSubscription
    );

    // register filterOperatorSubscription
    if (!registered) {
      await execute(
        'OPERATOR_FILTER_REGISTRY',
        {from: filterOperatorSubscription},
        'registerAndCopyEntries',
        [filterOperatorSubscription, DEFAULT_SUBSCRIPTION]
      );
      console.log(
        "common subscription registered on operator filter registry and opensea's blacklist copied"
      );
    }
  }
};
export default func;

func.tags = ['OperatorFilter', 'OperatorFilter_setup', 'L2'];
