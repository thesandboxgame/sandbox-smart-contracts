import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {nftCollectionAdmin} = await getNamedAccounts();

  const owner = await read('FistOfTheNorthStar', 'owner');

  if (nftCollectionAdmin?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      execute(
        'FistOfTheNorthStar',
        {from: owner, log: true},
        'transferOwnership',
        nftCollectionAdmin
      )
    );
  }
};

export default func;
func.tags = ['FistOfTheNorthStar', 'FistOfTheNorthStar_change_admin'];
func.dependencies = ['FistOfTheNorthStar_deploy'];
