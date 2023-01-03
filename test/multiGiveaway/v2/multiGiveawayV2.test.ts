import {ethers} from 'hardhat';
import {setupTestGiveaway} from './fixtures';
import {BigNumber, constants} from 'ethers';
import {
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
  expectReceiptEventWithArgs,
  findEvents,
  increaseTime,
  waitFor,
} from '../../utils';
import {sendMetaTx} from '../../sendMetaTx';
import {expect} from '../../chai-setup';

import helpers from '../../../lib/merkleTreeHelper';
import {
  testFinalAssetAndLandBalances,
  testInitialAssetAndLandBalances,
  testInitialERC20Balance,
  testUpdatedERC20Balance,
} from '../balanceHelpers';

const {calculateMultiClaimHash} = helpers;

const zeroAddress = constants.AddressZero;
const emptyBytes32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';
const randomMerkleTree =
  '0x0000000000000000000000000000000000000000000000000000000000000001';

describe('Multi_Giveaway_V2', function () {
  describe('Multi_Giveaway_common_functionality', function () {
    it('Default admin has the correct role', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, sandAdmin} = setUp;
      const defaultRole = emptyBytes32;
      expect(await giveawayContract.hasRole(defaultRole, sandAdmin)).to.be.true;
    });
    it('Admin has the correct role', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, multiGiveawayAdmin, multiGiveawayRole} = setUp;
      expect(
        await giveawayContract.hasRole(multiGiveawayRole, multiGiveawayAdmin)
      ).to.be.true;
    });
    it('Default admin can add a new giveaway (but only because same address is being currently used)', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContractAsAdmin} = setUp; // default admin = sandAdmin

      const receipt = await waitFor(
        giveawayContractAsAdmin.addNewGiveaway(
          randomMerkleTree,
          '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' // does not expire
        )
      );

      const event = await expectReceiptEventWithArgs(receipt, 'NewGiveaway');
      expect(event.args[0]).to.equal(randomMerkleTree);
      expect(event.args[1]).to.equal(
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      );
    });
    it('Multigiveaway admin can add a new giveaway', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContractAsMultiGiveawayAdmin} = setUp; // multigiveaway admin

      const receipt = await waitFor(
        giveawayContractAsMultiGiveawayAdmin.addNewGiveaway(
          randomMerkleTree,
          '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF' // does not expire
        )
      );

      const event = await expectReceiptEventWithArgs(receipt, 'NewGiveaway');
      expect(event.args[0]).to.equal(randomMerkleTree);
      expect(event.args[1]).to.equal(
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      );
    });
    it("Admin can't add the same giveaway twice", async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContractAsMultiGiveawayAdmin} = setUp;

      await giveawayContractAsMultiGiveawayAdmin.addNewGiveaway(
        randomMerkleTree,
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      );

      await expect(
        giveawayContractAsMultiGiveawayAdmin.addNewGiveaway(
          randomMerkleTree,
          '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_ALREADY_EXISTS');
    });

    it('Cannot add a new giveaway if not admin', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, others} = setUp;

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await expect(
        giveawayContractAsUser.addNewGiveaway(
          randomMerkleTree,
          '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
        )
      ).to.be.reverted;
    });
    it('Returns the expiry time of a giveaway', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContractAsAdmin, allMerkleRoots} = setUp;

      expect(
        await giveawayContractAsAdmin.getExpiryTime(allMerkleRoots[0])
      ).to.be.equal(
        '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'
      );
    });
    it('User can get their claimed status', async function () {
      const options = {multi: true};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, others, allClaims} = setUp;

      const claim = [];
      claim.push(allClaims[0][0]);
      claim.push(allClaims[1][0]);

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      const statuses = await giveawayContractAsUser.getClaimedStatus(
        others[0],
        claim
      );

      expect(statuses[0]).to.equal(false);
      expect(statuses[1]).to.equal(false);
    });

    it('Claimed status is correctly updated after allocated tokens are claimed - 2 claims of 2 claimed', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userClaims = [];
      const claim = allClaims[0][0];
      const secondClaim = allClaims[1][0];
      userClaims.push(claim);
      userClaims.push(secondClaim);

      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          allTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      userMerkleRoots.push(allMerkleRoots[1]);

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      const statuses = await giveawayContractAsUser.getClaimedStatus(
        others[0],
        userClaims
      );

      expect(statuses[0]).to.equal(false);
      expect(statuses[1]).to.equal(false);

      await giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      );

      const statusesAfterClaim = await giveawayContractAsUser.getClaimedStatus(
        others[0],
        userClaims
      );

      expect(statusesAfterClaim[0]).to.equal(true);
      expect(statusesAfterClaim[1]).to.equal(true);
    });

    it('Claimed status is correctly updated after allocated tokens are claimed - 1 claim of 2 claimed', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userClaims = [];
      const claimOnlyOne = [];
      const claim = allClaims[0][0];
      const secondClaim = allClaims[1][0];
      userClaims.push(claim);
      userClaims.push(secondClaim);
      userProofs.push(
        allTrees[1].getProof(calculateMultiClaimHash(userClaims[1]))
      );
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[1]);

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      const statuses = await giveawayContractAsUser.getClaimedStatus(
        others[0],
        userClaims
      );

      expect(statuses[0]).to.equal(false);
      expect(statuses[1]).to.equal(false);

      claimOnlyOne.push(secondClaim);

      await giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        claimOnlyOne,
        userProofs
      );

      const statusesAfterClaim = await giveawayContractAsUser.getClaimedStatus(
        others[0],
        userClaims
      );

      expect(statusesAfterClaim[0]).to.equal(false);
      expect(statusesAfterClaim[1]).to.equal(true);
    });
    it('MultiGiveaway contract returns ERC721 received', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, multiGiveawayAdmin, landContract} = setUp;
      const result = await giveawayContract.onERC721Received(
        multiGiveawayAdmin,
        landContract.address,
        0,
        '0x'
      );
      const expectedResult = '0x150b7a02';
      expect(result).to.equal(expectedResult);
    });
    it('MultiGiveaway contract returns ERC721 Batch received', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, multiGiveawayAdmin, landContract} = setUp;
      const result = await giveawayContract.onERC721BatchReceived(
        multiGiveawayAdmin,
        landContract.address,
        [0, 1],
        '0x'
      );
      const expectedResult = '0x4b808c46';
      expect(result).to.equal(expectedResult);
    });
    it('MultiGiveaway contract returns ERC1155 received for supply 1', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, multiGiveawayAdmin, assetContract} = setUp;
      const result = await giveawayContract.onERC1155Received(
        multiGiveawayAdmin,
        assetContract.address,
        0,
        1,
        '0x'
      );
      const expectedResult = '0xf23a6e61';
      expect(result).to.equal(expectedResult);
    });
    it('MultiGiveaway contract returns ERC1155 received', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, multiGiveawayAdmin, assetContract} = setUp;
      const result = await giveawayContract.onERC1155Received(
        multiGiveawayAdmin,
        assetContract.address,
        0,
        5,
        '0x'
      );
      const expectedResult = '0xf23a6e61';
      expect(result).to.equal(expectedResult);
    });
    it('MultiGiveaway contract returns ERC1155 Batch received', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, multiGiveawayAdmin, assetContract} = setUp;
      const result = await giveawayContract.onERC1155BatchReceived(
        multiGiveawayAdmin,
        assetContract.address,
        [0, 1],
        [5, 5],
        '0x'
      );
      const expectedResult = '0xbc197c81';
      expect(result).to.equal(expectedResult);
    });
  });
  describe('Multi_Giveaway_single_giveaway', function () {
    it('User cannot claim when test contract holds no tokens', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims, // all claims from all giveaways
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith(`can't substract more than there is`);
    });

    it('User cannot claim sand when contract does not hold any', async function () {
      const options = {
        mint: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith(`INSUFFICIENT_FUNDS`);
    });

    it('User can claim allocated multiple tokens from Giveaway contract', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        landContract,
        sandContract,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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

      const user = others[0];

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await testInitialAssetAndLandBalances(
        claim,
        assetContract,
        landContract,
        giveawayContract
      );

      await testInitialERC20Balance(user, sandContract);

      await waitFor(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      );

      await testFinalAssetAndLandBalances(
        claim,
        user,
        assetContract,
        landContract
      );

      await testUpdatedERC20Balance(claim, user, sandContract, 0);
    });

    it('User can claim allocated 64 tokens from Giveaway contract', async function () {
      const numberOfAssets = 64;
      const options = {
        mint: true,
        sand: true,
        numberOfAssets,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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
      console.log(
        'Number of assets:',
        numberOfAssets,
        '; Gas used:',
        receipt.gasUsed.toString()
      );
      const event = await expectEventWithArgs(
        assetContract,
        receipt,
        'TransferBatch'
      );
      expect(event.args.ids.length).to.eq(numberOfAssets);
    });

    it('Claimed Event is emitted for successful claim', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
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

      const claimedEvent = await expectReceiptEventWithArgs(
        receipt,
        'ClaimedMultipleTokens'
      );
      expect(claimedEvent.args[0]).to.equal(others[0]); // to

      expect(claimedEvent.args[1][0][0][0]).to.equal(claim.erc1155[0].ids[0]);
      expect(claimedEvent.args[1][0][0][1]).to.equal(claim.erc1155[0].ids[1]);
      expect(claimedEvent.args[1][0][0][2]).to.equal(claim.erc1155[0].ids[2]);

      expect(claimedEvent.args[1][0][1][0]).to.equal(
        claim.erc1155[0].values[0]
      );
      expect(claimedEvent.args[1][0][1][1]).to.equal(
        claim.erc1155[0].values[1]
      );
      expect(claimedEvent.args[1][0][1][2]).to.equal(
        claim.erc1155[0].values[2]
      );

      expect(claimedEvent.args[1][0][2]).to.equal(
        claim.erc1155[0].contractAddress
      );

      expect(claimedEvent.args[2][0][0][0]).to.equal(claim.erc721[0].ids[0]);
      expect(claimedEvent.args[2][0][0][1]).to.equal(claim.erc721[0].ids[1]);
      expect(claimedEvent.args[2][0][0][2]).to.equal(claim.erc721[0].ids[2]);
      expect(claimedEvent.args[2][0][0][3]).to.equal(claim.erc721[0].ids[3]);
      expect(claimedEvent.args[2][0][0][4]).to.equal(claim.erc721[0].ids[4]);
      expect(claimedEvent.args[2][0][0][5]).to.equal(claim.erc721[0].ids[5]);
      expect(claimedEvent.args[2][0][1]).to.equal(
        claim.erc721[0].contractAddress
      );
      expect(claimedEvent.args[3][0][0]).to.equal(claim.erc20.amounts[0]);
      expect(claimedEvent.args[3][1][0]).to.equal(
        claim.erc20.contractAddresses[0]
      );
    });

    it('User can claim allocated ERC20 from Giveaway contract when there are no assets or lands allocated', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
        sandContract,
      } = setUp;
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[0]);
      const userClaims = [];
      const claim = allClaims[0][4];
      userClaims.push(claim);
      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await testInitialERC20Balance(user, sandContract);

      await waitFor(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      );

      await testUpdatedERC20Balance(claim, user, sandContract, 0);
    });

    it('User cannot claim if they claim the wrong amount of ERC20', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      const badClaim = JSON.parse(JSON.stringify(allClaims[0][0])); // deep clone
      badClaim.erc20.amounts[0] = 250; // bad param

      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[0]);
      const userClaims = [];
      userClaims.push(badClaim);
      userProofs.push(
        userTrees[0].getProof(calculateMultiClaimHash(allClaims[0][0]))
      );
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('CLAIM_INVALID');
    });

    it('User cannot claim more than once', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
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

      await waitFor(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      );
      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_DESTINATION_ALREADY_CLAIMED');
    });

    it('User cannot claim from Giveaway contract if destination is not the reserved address', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      const badClaim = JSON.parse(JSON.stringify(allClaims[0][0])); // deep clone
      badClaim.to = others[2]; // bad param
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[0]);
      const userClaims = [];
      userClaims.push(badClaim);
      userProofs.push(
        userTrees[0].getProof(calculateMultiClaimHash(allClaims[0][0]))
      );
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('CLAIM_INVALID');
    });

    it('User cannot claim from Giveaway contract to destination zeroAddress', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      const badClaim = JSON.parse(JSON.stringify(allClaims[0][0])); // deep clone
      badClaim.to = zeroAddress; // bad param
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[0]);
      const userClaims = [];
      userClaims.push(badClaim);
      userProofs.push(
        userTrees[0].getProof(calculateMultiClaimHash(allClaims[0][0]))
      );
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_INVALID_TO_ZERO_ADDRESS');
    });

    it('User cannot claim from Giveaway contract to destination MultiGiveaway contract address', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      const badClaim = JSON.parse(JSON.stringify(allClaims[0][0])); // deep clone
      badClaim.to = giveawayContract.address; // bad param
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[0]);
      const userClaims = [];
      userClaims.push(badClaim);
      userProofs.push(
        userTrees[0].getProof(calculateMultiClaimHash(allClaims[0][0]))
      );
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_DESTINATION_MULTIGIVEAWAY_CONTRACT');
    });

    it('User cannot claim from Giveaway if ERC1155 contract address is zeroAddress', async function () {
      const options = {
        mint: true,
        sand: true,
        badData: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[1]);
      const userClaims = [];
      const claim = allClaims[1][3];
      userClaims.push(claim);
      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[1]);

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('CLAIM_INVALID_CONTRACT_ZERO_ADDRESS');
    });

    it('User cannot claim from Giveaway if ERC721 contract address is zeroAddress', async function () {
      const options = {
        mint: true,
        sand: true,
        badData: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[1]);
      const userClaims = [];
      const claim = allClaims[1][2];
      userClaims.push(claim);
      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[1]);

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('CLAIM_INVALID_CONTRACT_ZERO_ADDRESS');
    });

    it('User cannot claim from Giveaway if ERC20 contract address is zeroAddress', async function () {
      const options = {
        mint: true,
        sand: true,
        badData: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[1]);
      const userClaims = [];
      const claim = allClaims[1][4];
      userClaims.push(claim);
      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[1]);

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('CLAIM_INVALID_CONTRACT_ZERO_ADDRESS');
    });

    it('User cannot claim from Giveaway if ERC20 contract address array length does not match amounts array length', async function () {
      const options = {
        mint: true,
        sand: true,
        badData: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[1]);
      const userClaims = [];
      const claim = allClaims[1][1];
      userClaims.push(claim);
      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[1]);

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('CLAIM_INVALID_INPUT');
    });

    it('User cannot claim from Giveaway if ERC1155 values array length does not match ids array length', async function () {
      const options = {
        mint: true,
        sand: true,
        badData: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userTrees = [];
      userTrees.push(allTrees[1]);
      const userClaims = [];
      const claim = allClaims[1][0];
      userClaims.push(claim);
      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          userTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[1]);

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('CLAIM_INVALID_INPUT');
    });

    it('User cannot claim after the expiryTime', async function () {
      const duration = 30 * 24 * 60 * 60;

      const options = {
        mint: true,
        sand: true,
        duration: duration,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
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

      await increaseTime(duration);

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );
      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_CLAIM_PERIOD_IS_OVER');
    });

    it('User cannot add a giveaway if expiryTime is 0', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContractAsMultiGiveawayAdmin,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      const periodFinish = BigNumber.from(0); // expiryTime 0
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

      await expect(
        giveawayContractAsMultiGiveawayAdmin.addNewGiveaway(
          allMerkleRoots[0],
          periodFinish
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_INVALID_INPUT');
    });
  });

  describe('Multi_Giveaway_two_giveaways', function () {
    it('User cannot claim when test contract holds no tokens - multiple giveaways, 1 claim', async function () {
      const options = {multi: true};
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith(`can't substract more than there is`);
    });

    it('User cannot claim sand when contract does not hold any - multiple giveaways, 1 claim', async function () {
      const options = {
        mint: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith(`INSUFFICIENT_FUNDS`);
    });

    it('User can claim allocated multiple tokens from Giveaway contract - multiple giveaways, 1 claim', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        landContract,
        sandContract,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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
      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await testInitialAssetAndLandBalances(
        claim,
        assetContract,
        landContract,
        giveawayContract
      );

      await testInitialERC20Balance(user, sandContract);

      await waitFor(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      );

      await testFinalAssetAndLandBalances(
        claim,
        user,
        assetContract,
        landContract
      );

      await testUpdatedERC20Balance(claim, user, sandContract, 0);
    });

    it('User can claim allocated multiple tokens from Giveaway contract - multiple giveaways, 2 claims', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        speedGemContract,
        rareCatalystContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        landContract,
        sandContract,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userClaims = [];
      const claim = allClaims[0][0];
      const secondClaim = allClaims[1][0];
      userClaims.push(claim);
      userClaims.push(secondClaim);

      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          allTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      userMerkleRoots.push(allMerkleRoots[1]);
      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      // ERC20

      await testInitialERC20Balance(user, sandContract);
      await testInitialERC20Balance(user, speedGemContract);
      await testInitialERC20Balance(user, rareCatalystContract);

      // Claim 1

      await testInitialAssetAndLandBalances(
        claim,
        assetContract,
        landContract,
        giveawayContract
      );

      // Claim 2

      await testInitialAssetAndLandBalances(
        secondClaim,
        assetContract,
        landContract,
        giveawayContract
      );

      await waitFor(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      );

      // ERC20

      const updatedSandBalance = await sandContract.balanceOf(user);
      expect(updatedSandBalance).to.equal(
        BigNumber.from(claim.erc20.amounts[0]).add(
          BigNumber.from(secondClaim.erc20.amounts[0])
        )
      );
      await testUpdatedERC20Balance(secondClaim, user, speedGemContract, 1);
      await testUpdatedERC20Balance(secondClaim, user, rareCatalystContract, 2);

      // Claim 1

      await testFinalAssetAndLandBalances(
        claim,
        user,
        assetContract,
        landContract
      );

      // Claim 2

      await testFinalAssetAndLandBalances(
        secondClaim,
        user,
        assetContract,
        landContract
      );
    });

    it('User cannot claim from Giveaway contract if the claims array length does not match merkle root array length', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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
      userMerkleRoots.push(allMerkleRoots[0]); // extra merkle root
      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_INVALID_INPUT');
    });

    it('User cannot claim from Giveaway contract if the claims array length does not match proofs array length', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
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
      userProofs.push(userProofs[0]); // extra proof
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith('MULTIGIVEAWAY_INVALID_INPUT');
    });

    it('User cannot claim allocated tokens from Giveaway contract more than once - multiple giveaways, 2 claims', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      // make arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userClaims = [];
      const claim = allClaims[0][0];
      const secondClaim = allClaims[1][0];
      userClaims.push(claim);
      userClaims.push(secondClaim);

      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          allTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      userMerkleRoots.push(allMerkleRoots[1]);

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await waitFor(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokensFromMultipleMerkleTree(
          userMerkleRoots,
          userClaims,
          userProofs
        )
      ).to.be.revertedWith(`MULTIGIVEAWAY_DESTINATION_ALREADY_CLAIMED`);
    });
  });

  describe('Multi_Giveaway_single_claim', function () {
    it('User cannot claim when test contract holds no tokens', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims, // all claims from all giveaways
        allMerkleRoots,
      } = setUp;

      const tree = allTrees[0];
      const claim = allClaims[0][0];
      const proof = tree.getProof(calculateMultiClaimHash(claim));
      const merkleRoot = allMerkleRoots[0];

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokens(merkleRoot, claim, proof)
      ).to.be.revertedWith(`can't substract more than there is`);
    });

    it('User cannot claim sand when contract does not hold any', async function () {
      const options = {
        mint: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      const tree = allTrees[0];
      const claim = allClaims[0][0];
      const proof = tree.getProof(calculateMultiClaimHash(claim));
      const merkleRoot = allMerkleRoots[0];

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await expect(
        giveawayContractAsUser.claimMultipleTokens(merkleRoot, claim, proof)
      ).to.be.revertedWith(`INSUFFICIENT_FUNDS`);
    });

    it('User can claim allocated multiple tokens from Giveaway contract', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        landContract,
        sandContract,
        allMerkleRoots,
      } = setUp;

      const tree = allTrees[0];
      const claim = allClaims[0][0];
      const proof = tree.getProof(calculateMultiClaimHash(claim));
      const merkleRoot = allMerkleRoots[0];
      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await testInitialAssetAndLandBalances(
        claim,
        assetContract,
        landContract,
        giveawayContract
      );
      await testInitialERC20Balance(user, sandContract);

      await waitFor(
        giveawayContractAsUser.claimMultipleTokens(merkleRoot, claim, proof)
      );

      await testFinalAssetAndLandBalances(
        claim,
        user,
        assetContract,
        landContract
      );
      await testUpdatedERC20Balance(claim, user, sandContract, 0);
    });

    it('Claimed Event is emitted for successful claim', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allClaims,
        allTrees,
        allMerkleRoots,
      } = setUp;

      const tree = allTrees[0];
      const claim = allClaims[0][0];
      const proof = tree.getProof(calculateMultiClaimHash(claim));
      const merkleRoot = allMerkleRoots[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      const receipt = await waitFor(
        giveawayContractAsUser.claimMultipleTokens(merkleRoot, claim, proof)
      );

      const claimedEvent = await expectReceiptEventWithArgs(
        receipt,
        'ClaimedMultipleTokens'
      );
      expect(claimedEvent.args[0]).to.equal(others[0]); // to

      expect(claimedEvent.args[1][0][0][0]).to.equal(claim.erc1155[0].ids[0]);
      expect(claimedEvent.args[1][0][0][1]).to.equal(claim.erc1155[0].ids[1]);
      expect(claimedEvent.args[1][0][0][2]).to.equal(claim.erc1155[0].ids[2]);

      expect(claimedEvent.args[1][0][1][0]).to.equal(
        claim.erc1155[0].values[0]
      );
      expect(claimedEvent.args[1][0][1][1]).to.equal(
        claim.erc1155[0].values[1]
      );
      expect(claimedEvent.args[1][0][1][2]).to.equal(
        claim.erc1155[0].values[2]
      );

      expect(claimedEvent.args[1][0][2]).to.equal(
        claim.erc1155[0].contractAddress
      );

      expect(claimedEvent.args[2][0][0][0]).to.equal(claim.erc721[0].ids[0]);
      expect(claimedEvent.args[2][0][0][1]).to.equal(claim.erc721[0].ids[1]);
      expect(claimedEvent.args[2][0][0][2]).to.equal(claim.erc721[0].ids[2]);
      expect(claimedEvent.args[2][0][0][3]).to.equal(claim.erc721[0].ids[3]);
      expect(claimedEvent.args[2][0][0][4]).to.equal(claim.erc721[0].ids[4]);
      expect(claimedEvent.args[2][0][0][5]).to.equal(claim.erc721[0].ids[5]);
      expect(claimedEvent.args[2][0][1]).to.equal(
        claim.erc721[0].contractAddress
      );
      expect(claimedEvent.args[3][0][0]).to.equal(claim.erc20.amounts[0]);
      expect(claimedEvent.args[3][1][0]).to.equal(
        claim.erc20.contractAddresses[0]
      );

      expect(claimedEvent.args[4]).to.equal(merkleRoot);
    });
    it('User cannot claim more than once', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
      } = setUp;

      const tree = allTrees[0];
      const claim = allClaims[0][0];
      const proof = tree.getProof(calculateMultiClaimHash(claim));
      const merkleRoot = allMerkleRoots[0];

      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(others[0])
      );

      await waitFor(
        giveawayContractAsUser.claimMultipleTokens(merkleRoot, claim, proof)
      );
      await expect(
        giveawayContractAsUser.claimMultipleTokens(merkleRoot, claim, proof)
      ).to.be.revertedWith('MULTIGIVEAWAY_DESTINATION_ALREADY_CLAIMED');
    });
  });
  describe('Trusted_forwarder_and_meta-tx', function () {
    it('should fail to set the trusted forwarder if not admin', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContract, others} = setUp;
      const user = others[5];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );
      await expect(giveawayContractAsUser.setTrustedForwarder(user)).to.be
        .reverted;
    });

    it('should succeed in setting the trusted forwarder if admin', async function () {
      const options = {};
      const setUp = await setupTestGiveaway(options);
      const {giveawayContractAsAdmin, others} = setUp;
      const user = others[7];

      await expect(giveawayContractAsAdmin.setTrustedForwarder(user)).to.be.not
        .reverted;

      expect(await giveawayContractAsAdmin.getTrustedForwarder()).to.be.equal(
        user
      );
    });

    it('claim with meta-tx: user can claim from single giveaway using single claim function', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        landContract,
        sandContract,
        allMerkleRoots,
        trustedForwarder,
      } = setUp;

      const tree = allTrees[0];
      const claim = allClaims[0][0];
      const proof = tree.getProof(calculateMultiClaimHash(claim));
      const merkleRoot = allMerkleRoots[0];

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      await testInitialAssetAndLandBalances(
        claim,
        assetContract,
        landContract,
        giveawayContract
      );
      await testInitialERC20Balance(user, sandContract);

      // Action the claim metatx

      const {
        to,
        data,
      } = await giveawayContractAsUser.populateTransaction.claimMultipleTokens(
        merkleRoot,
        claim,
        proof
      );

      const receipt = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );
      const txEvent = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt,
        'TXResult'
      );

      expect(txEvent.args.success).to.be.true;

      const eventsMatching = await findEvents(
        giveawayContract,
        'ClaimedMultipleTokens',
        receipt.blockHash
      );

      // 1 merkle root means only 1 event is expected
      expect(eventsMatching.length).to.be.equal(1);

      // Check amounts after claim

      await testFinalAssetAndLandBalances(
        claim,
        user,
        assetContract,
        landContract
      );
      await testUpdatedERC20Balance(claim, user, sandContract, 0);
    });

    it('claim with meta-tx: user cannot claim from single giveaway using single claim function more than once', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
        trustedForwarder,
      } = setUp;

      const tree = allTrees[0];
      const claim = allClaims[0][0];
      const proof = tree.getProof(calculateMultiClaimHash(claim));
      const merkleRoot = allMerkleRoots[0];

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      const {
        to,
        data,
      } = await giveawayContractAsUser.populateTransaction.claimMultipleTokens(
        merkleRoot,
        claim,
        proof
      );

      const receipt1 = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );

      const txEventGood = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt1,
        'TXResult'
      );

      expect(txEventGood.args.success).to.be.true;

      const receipt2 = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );

      const txEventBad = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt2,
        'TXResult'
      );

      expect(txEventBad.args.success).to.be.false;
    });

    it('claim with meta-tx: user can claim from single giveaway using multiple claim function', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        landContract,
        sandContract,
        allMerkleRoots,
        trustedForwarder,
      } = setUp;

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      // make arrays of claims and proofs relevant to specific user
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

      await testInitialAssetAndLandBalances(
        claim,
        assetContract,
        landContract,
        giveawayContract
      );
      await testInitialERC20Balance(user, sandContract);

      // Action the claim metatx

      const {
        to,
        data,
      } = await giveawayContractAsUser.populateTransaction.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      );

      const receipt = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );
      const txEvent = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt,
        'TXResult'
      );

      expect(txEvent.args.success).to.be.true;

      const eventsMatching = await findEvents(
        giveawayContract,
        'ClaimedMultipleTokens',
        receipt.blockHash
      );

      // 1 merkle root means only 1 event is expected
      expect(eventsMatching.length).to.be.equal(1);

      // Check amounts after claim

      await testFinalAssetAndLandBalances(
        claim,
        user,
        assetContract,
        landContract
      );
      await testUpdatedERC20Balance(claim, user, sandContract, 0);
    });

    it('claim with meta-tx: user cannot claim from single giveaway using multiple claim function more than once', async function () {
      const options = {
        mint: true,
        sand: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
        trustedForwarder,
      } = setUp;

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      // make arrays of claims and proofs relevant to specific user
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

      const {
        to,
        data,
      } = await giveawayContractAsUser.populateTransaction.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      );

      const receipt1 = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );

      const txEventGood = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt1,
        'TXResult'
      );

      expect(txEventGood.args.success).to.be.true;

      const receipt2 = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );

      const txEventBad = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt2,
        'TXResult'
      );

      expect(txEventBad.args.success).to.be.false;
    });

    it('claim with meta-tx: user can claim from multiple giveaways', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        speedGemContract,
        rareCatalystContract,
        others,
        allTrees,
        allClaims,
        assetContract,
        landContract,
        sandContract,
        allMerkleRoots,
        trustedForwarder,
      } = setUp;

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      // ake arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userClaims = [];
      const claim = allClaims[0][0];
      const secondClaim = allClaims[1][0];
      userClaims.push(claim);
      userClaims.push(secondClaim);

      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          allTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      userMerkleRoots.push(allMerkleRoots[1]);

      // Check amounts before claim

      // ERC20

      await testInitialERC20Balance(user, sandContract);
      await testInitialERC20Balance(user, speedGemContract);
      await testInitialERC20Balance(user, rareCatalystContract);

      // Claim 1

      await testInitialAssetAndLandBalances(
        claim,
        assetContract,
        landContract,
        giveawayContract
      );

      // Claim 2

      await testInitialAssetAndLandBalances(
        secondClaim,
        assetContract,
        landContract,
        giveawayContract
      );

      // Action the claim metatx

      const {
        to,
        data,
      } = await giveawayContractAsUser.populateTransaction.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      );

      const receipt = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );
      const txEvent = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt,
        'TXResult'
      );

      expect(txEvent.args.success).to.be.true;

      const eventsMatching = await findEvents(
        giveawayContract,
        'ClaimedMultipleTokens',
        receipt.blockHash
      );

      // multiple claims means multiple events are expected
      expect(eventsMatching.length).to.be.equal(2);

      // Check amounts after claim

      // ERC20

      const updatedSandBalance = await sandContract.balanceOf(user);
      expect(updatedSandBalance).to.equal(
        BigNumber.from(claim.erc20.amounts[0]).add(
          BigNumber.from(secondClaim.erc20.amounts[0])
        )
      );

      await testUpdatedERC20Balance(secondClaim, user, speedGemContract, 1);
      await testUpdatedERC20Balance(secondClaim, user, rareCatalystContract, 2);

      // Claim 1

      await testFinalAssetAndLandBalances(
        claim,
        user,
        assetContract,
        landContract
      );

      // Claim 2

      await testFinalAssetAndLandBalances(
        secondClaim,
        user,
        assetContract,
        landContract
      );
    });

    it('claim with meta-tx: user cannot claim from multiple giveaways more than once', async function () {
      const options = {
        mint: true,
        sand: true,
        multi: true,
      };
      const setUp = await setupTestGiveaway(options);
      const {
        giveawayContract,
        others,
        allTrees,
        allClaims,
        allMerkleRoots,
        trustedForwarder,
      } = setUp;

      const user = others[0];
      const giveawayContractAsUser = await giveawayContract.connect(
        ethers.provider.getSigner(user)
      );

      // ake arrays of claims and proofs relevant to specific user
      const userProofs = [];
      const userClaims = [];
      const claim = allClaims[0][0];
      const secondClaim = allClaims[1][0];
      userClaims.push(claim);
      userClaims.push(secondClaim);

      for (let i = 0; i < userClaims.length; i++) {
        userProofs.push(
          allTrees[i].getProof(calculateMultiClaimHash(userClaims[i]))
        );
      }
      const userMerkleRoots = [];
      userMerkleRoots.push(allMerkleRoots[0]);
      userMerkleRoots.push(allMerkleRoots[1]);

      const {
        to,
        data,
      } = await giveawayContractAsUser.populateTransaction.claimMultipleTokensFromMultipleMerkleTree(
        userMerkleRoots,
        userClaims,
        userProofs
      );

      const receipt1 = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );

      const txEventGood = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt1,
        'TXResult'
      );

      expect(txEventGood.args.success).to.be.true;

      const receipt2 = await sendMetaTx(
        to,
        trustedForwarder,
        data,
        user,
        '1000000'
      );

      const txEventBad = await expectEventWithArgsFromReceipt(
        trustedForwarder,
        receipt2,
        'TXResult'
      );

      expect(txEventBad.args.success).to.be.false;
    });
  });
});
