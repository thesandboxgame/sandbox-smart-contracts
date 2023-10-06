import {DeployFunction} from 'hardhat-deploy/types';
import {HardhatRuntimeEnvironment} from 'hardhat/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {catchUnknownSigner, execute, read} = deployments;
  const {nftCollectionAdmin} = await getNamedAccounts();

  const owner = await read('CollectionFactory', 'owner');

  if (nftCollectionAdmin?.toLocaleLowerCase() !== owner?.toLocaleLowerCase()) {
    await catchUnknownSigner(
      // This only starts the fist step in a 2step ownership transfer
      // the second step involves the "nftCollectionAdmin" multisig to accept the new ownership
      // by calling the "acceptOwnership" function on the CollectionFactory
      execute(
        'CollectionFactory',
        {from: owner, log: true},
        'transferOwnership',
        nftCollectionAdmin
      )
    );
  }
};

export default func;
func.tags = ['CollectionFactory', 'CollectionFactory_change_admin'];
func.dependencies = ['CollectionFactory_deploy'];
