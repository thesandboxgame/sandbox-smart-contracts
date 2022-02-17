import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction, DeploymentsExtension} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments} = hre;
  const sandContract = await deployments.get('Sand');
  await disableMetaTx(deployments, 'Land', sandContract.address);
  await disableMetaTx(deployments, 'Land_Old', sandContract.address);
};

async function disableMetaTx(
  deployments: DeploymentsExtension,
  contractName: string,
  address: string
) {
  const {execute, read, catchUnknownSigner} = deployments;
  let isMetaTx = false;
  try {
    isMetaTx = await read(contractName, 'isMetaTransactionProcessor', address);
  } catch (e) {
    // it's disabled
  }
  if (isMetaTx) {
    const admin = await read(contractName, 'getAdmin');
    await catchUnknownSigner(
      execute(
        contractName,
        {from: admin, log: true},
        'setMetaTransactionProcessor',
        address,
        false
      )
    );
  }
}

export default func;
func.runAtTheEnd = true;
func.tags = ['Land', 'Land_setup', 'LandMetaTx'];
func.dependencies = ['Land_deploy'];
