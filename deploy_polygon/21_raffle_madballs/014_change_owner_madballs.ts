import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {nftCollectionAdmin} = await getNamedAccounts();

  const owner = await read('MadBalls', 'owner');

  if (nftCollectionAdmin?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'MadBalls',
        {from: owner, log: true},
        'transferOwnership',
        nftCollectionAdmin
      )
    );
  }
};

export default func;
func.tags = ['MadBalls', 'MadBalls_change_admin'];
func.dependencies = ['MadBalls_deploy'];
