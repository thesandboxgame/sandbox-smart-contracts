import {ethers, deployments} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {BigNumber, Contract} from 'ethers';
// import Matic from '@maticnetwork/maticjs';
// import Network from '@maticnetwork/meta/network';
import {smockit, smoddit} from '@eth-optimism/smock';

export const setupPredicate = deployments.createFixture(async () => {
  await deployments.fixture();

  // const assetContract: Contract = await ethers.getContract('Asset');
  const erc1155Predicate: Contract = await ethers.getContract(
    'SandboxMintableERC1155Predicate'
  );
  // const l2AssetContract: Contract = await ethers.getContract('L2Asset');

  /**
  const MyContractFactory = await ethers.getContractFactory('MyContract')
  const MyContract = await MyContractFactory.deploy(...)

  // Smockit!
  const MyMockContract = await smockit(MyContract)

  MyMockContract.smocked.myFunction.will.return.with('Some return value!')
  console.log(await MyMockContract.myFunction()) // 'Some return value!'
*/

  return {
    // assetContract,
    erc1155Predicate,
    // l2AssetContract,
  };
});
