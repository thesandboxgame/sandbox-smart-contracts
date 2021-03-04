import {ethers, deployments} from 'hardhat';
import {Address} from 'hardhat-deploy/types';
import {BigNumber, Contract} from 'ethers';
// import Matic from '@maticnetwork/maticjs';
// import Network from '@maticnetwork/meta/network';
// import {smockit, smoddit} from '@eth-optimism/smock';

export const setupPredicate = deployments.createFixture(async () => {
  await deployments.fixture();

  const erc1155Predicate: Contract = await ethers.getContract(
    'SandboxMintableERC1155Predicate'
  );

  return {
    erc1155Predicate,
  };
});
