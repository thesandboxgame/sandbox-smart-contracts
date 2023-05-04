import hre, {getNamedAccounts} from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function () {
  const {deployments} = hre;
  const {execute, read, catchUnknownSigner} = deployments;
  const {upgradeAdmin} = await getNamedAccounts();

  const currentOwner = await read('DefaultProxyAdmin', 'owner');
  if (currentOwner !== upgradeAdmin) {
    await catchUnknownSigner(
      execute(
        'DefaultProxyAdmin',
        {from: currentOwner, log: true},
        'transferOwnership',
        upgradeAdmin
      )
    );
  } else {
    console.log('already set to ' + currentOwner);
  }
};
export default func;

if (require.main === module) {
  func(hre).catch((err) => console.error(err));
}
