import {ethers} from 'hardhat';
import {setupTestGiveaway} from './fixtures';
import {waitFor} from '../../utils';
import helpers from '../../../lib/merkleTreeHelper';
const {calculateMultiClaimHash} = helpers;

describe('GAS:Multi_Giveaway_1:Claiming', function () {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gasReport: any = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function record(name: any, gasUsed: any) {
    gasReport[name] = gasUsed.toNumber();
  }
  after(function () {
    console.log(JSON.stringify(gasReport, null, '  '));
  });

  it('1 claim', async function () {
    const options = {
      mintSingleAsset: 1,
      sand: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {
      giveawayContract,
      others,
      allTrees,
      allMerkleRoots,
      allClaims,
    } = setUp;
    const userProofs = [];
    const userTrees = [];
    userTrees.push(allTrees[0]);
    const userClaims = [];
    const claim = allClaims[0][0];
    userClaims.push(claim);
    for (let i = 0; i < userClaims.length; i++) {
      userProofs.push(
        userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
      );
    }
    const userMerkleRoots = [];
    userMerkleRoots.push(allMerkleRoots[0]);

    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );

    const receipt = await waitFor(
      giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      )
    );
    record('Gas per claim - 1 claim total', receipt.gasUsed);
  });

  it('10 claims', async function () {
    const options = {
      mintSingleAsset: 10,
      sand: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {
      giveawayContract,
      others,
      allTrees,
      allMerkleRoots,
      allClaims,
    } = setUp;
    const userProofs = [];
    const userTrees = [];
    userTrees.push(allTrees[0]);
    const userClaims = [];
    userClaims.push(allClaims[0][0]);
    for (let i = 0; i < userClaims.length; i++) {
      userProofs.push(
        userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
      );
    }
    const userMerkleRoots = [];
    userMerkleRoots.push(allMerkleRoots[0]);

    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );
    const receipt = await waitFor(
      giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      )
    );
    record('Gas per claim - 10 claims total', receipt.gasUsed);
  });

  it('4000 claims', async function () {
    const options = {
      mintSingleAsset: 4000,
      sand: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {
      giveawayContract,
      others,
      allTrees,
      allMerkleRoots,
      allClaims,
    } = setUp;
    const userProofs = [];
    const userTrees = [];
    userTrees.push(allTrees[0]);
    const userClaims = [];
    userClaims.push(allClaims[0][0]);
    for (let i = 0; i < userClaims.length; i++) {
      userProofs.push(
        userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
      );
    }
    const userMerkleRoots = [];
    userMerkleRoots.push(allMerkleRoots[0]);

    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );
    const receipt = await waitFor(
      giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      )
    );
    record('Gas per claim - 4000 claims total', receipt.gasUsed);
  });

  it('10000 claims', async function () {
    const options = {
      mintSingleAsset: 10000,
      sand: true,
    };
    const setUp = await setupTestGiveaway(options);
    const {
      giveawayContract,
      others,
      allTrees,
      allMerkleRoots,
      allClaims,
    } = setUp;
    const userProofs = [];
    const userTrees = [];
    userTrees.push(allTrees[0]);
    const userClaims = [];
    userClaims.push(allClaims[0][0]);
    for (let i = 0; i < userClaims.length; i++) {
      userProofs.push(
        userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
      );
    }
    const userMerkleRoots = [];
    userMerkleRoots.push(allMerkleRoots[0]);

    const giveawayContractAsUser = await giveawayContract.connect(
      ethers.provider.getSigner(others[0])
    );
    const receipt = await waitFor(
      giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      )
    );
    record('Gas per claim - 10000 claims total', receipt.gasUsed);
  });
});
