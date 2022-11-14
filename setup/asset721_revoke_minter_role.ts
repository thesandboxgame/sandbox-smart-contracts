import hre from 'hardhat';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function () {
  const {deployments, getNamedAccounts} = hre;
  const {read, execute, catchUnknownSigner} = deployments;
  const DeployerBatch = await deployments.get('DeployerBatch');
  const {assetAdmin} = await getNamedAccounts();

  const mintRole = await read('AssetERC721', 'MINTER_ROLE');
  const isMinter = await read(
    'AssetERC721',
    'hasRole',
    mintRole,
    DeployerBatch.address
  );
  if (!isMinter) {
    console.log('DeployerBatch is not a minter');
    await catchUnknownSigner(
      execute(
        'AssetERC721',
        {from: assetAdmin, log: true},
        'revokeRole',
        mintRole,
        DeployerBatch.address
      )
    );
  }
};

export default func;

if (require.main === module) void func(hre);
