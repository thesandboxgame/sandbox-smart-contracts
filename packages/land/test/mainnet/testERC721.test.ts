import {expect} from 'chai';
import {ZeroAddress} from 'ethers';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupLandERC721} from './fixtures';

describe('LandBaseToken:ERC721', function () {
  describe('non existing NFT', function () {
    it('transferring a non existing NFT fails', async function () {
      const {landAsOwner, deployer, other1} =
        await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.transferFrom(deployer, other1, 10000000),
      ).to.be.revertedWith('token does not exist');
    });

    it('tx balanceOf a zero owner fails', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      await expect(landAsOwner.balanceOf(ZeroAddress)).to.be.revertedWith(
        'owner is zero address',
      );
    });

    it('call balanceOf a zero owner fails', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.balanceOf.staticCall(ZeroAddress),
      ).to.be.revertedWith('owner is zero address');
    });

    it('tx ownerOf a non existing NFT fails', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      await expect(landAsOwner.ownerOf(1000000000)).to.be.revertedWith(
        'token does not exist',
      );
    });

    it('call ownerOf a non existing NFT fails', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.ownerOf.staticCall(1000000000),
      ).to.be.revertedWith('token does not exist');
    });

    it('tx getApproved a non existing NFT fails', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      await expect(landAsOwner.getApproved(1000000000)).to.be.revertedWith(
        'token does not exist',
      );
    });

    it('call getApproved a non existing NFT fails', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.getApproved.staticCall(1000000000),
      ).to.be.revertedWith('token does not exist');
    });
  });

  describe('balance', function () {
    it('balance is zero for new user', async function () {
      const {landAsOwner, other} = await loadFixture(setupLandERC721);
      const balance = await landAsOwner.balanceOf(other);
      expect(balance).to.be.equal(0);
    });

    it('balance return correct value', async function () {
      const {landAsOwner, landAsOther, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      const balance = await landAsOwner.balanceOf(other);
      expect(balance).to.be.equal(0);

      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      let newBalance = await landAsOwner.balanceOf(other);
      expect(newBalance).to.be.equal(1);
      await landAsOwner.transferFrom(owner, other, tokenIds[1]);

      newBalance = await landAsOwner.balanceOf(other);
      expect(newBalance).to.be.equal(2);

      await landAsOther.transferFrom(other, other1, tokenIds[0]);

      newBalance = await landAsOwner.balanceOf(other);
      expect(newBalance).to.be.equal(1);
    });
  });

  describe('mint', function () {
    it('mint result in a transfer from 0 event', async function () {
      const {landAsOwner, other, mint} = await loadFixture(setupLandERC721);
      const {receipt, tokenId} = await mint(other);
      await expect(receipt)
        .to.emit(landAsOwner, 'Transfer')
        .withArgs(ZeroAddress, other, tokenId);
    });

    it('mint for gives correct owner', async function () {
      const {landAsOwner, other, mint} = await loadFixture(setupLandERC721);
      const {tokenId} = await mint(other);
      expect(await landAsOwner.ownerOf(tokenId)).to.be.equal(other);
    });
  });

  describe('burn', function () {
    it('burn result in a transfer to 0 event', async function () {
      const {landAsOther, other, mint} = await loadFixture(setupLandERC721);
      const {tokenId} = await mint(other);
      await expect(landAsOther['burn(uint256)'](tokenId))
        .to.emit(landAsOther, 'Transfer')
        .withArgs(other, ZeroAddress, tokenId);
    });
    it('burn result in ownerOf throwing', async function () {
      const {landAsOther, other, mint} = await loadFixture(setupLandERC721);
      const {tokenId} = await mint(other);
      await landAsOther.ownerOf(tokenId);
      await landAsOther['burn(uint256)'](tokenId);
      await expect(landAsOther.ownerOf.staticCall(tokenId)).to.be.revertedWith(
        'token does not exist',
      );
    });
  });

  describe('batchTransfer', function () {
    it('batch transfer of same NFT ids should fails', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.batchTransferFrom(
          owner,
          other,
          [tokenIds[1], tokenIds[1], tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith('not owner in batchTransferFrom');
    });
    it('batch transfer works', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      expect(await landAsOwner.balanceOf(other)).to.be.equal(0);
      await landAsOwner.batchTransferFrom(owner, other, tokenIds, '0x');
      expect(await landAsOwner.balanceOf(other)).to.be.equal(3);
    });
  });

  describe('mandatory batchTransfer', function () {
    it('batch transferring to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.batchTransferFrom(
        owner,
        testERC721TokenReceiver,
        [tokenIds[0]],
        '0x',
      );
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(
        testERC721TokenReceiver,
      );
    });
    it('batch transferring to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await testERC721TokenReceiver.rejectBatchTokens();
      await expect(
        landAsOwner.batchTransferFrom(
          owner,
          testERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith('Batch Receive not allowed');
    });
    it('batch transferring to a contract that do not accept erc721 token should fail', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await testERC721TokenReceiver.rejectBatchTokens();
      await expect(
        landAsOwner.batchTransferFrom(
          owner,
          testERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith('Batch Receive not allowed');
    });

    it('batch transferring to a contract that do not return the correct onERC721Received bytes should fail', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await testERC721TokenReceiver.returnWrongBytes();
      await expect(
        landAsOwner.batchTransferFrom(
          owner,
          testERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith('erc721 batch transfer rejected by to');
    });

    it('batch transferring to a contract that do not implemented mandatory receiver should not fail', async function () {
      const {landAsOwner, owner, tokenIds} = await loadFixture(setupLandERC721);
      await landAsOwner.batchTransferFrom(
        owner,
        landAsOwner,
        [tokenIds[0]],
        '0x',
      );
    });

    it('batch transferring to a contract that return the correct onERC721Received bytes should succeed', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.batchTransferFrom(
        owner,
        testERC721TokenReceiver,
        [tokenIds[0]],
        '0x',
      );
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(
        testERC721TokenReceiver,
      );
    });
  });

  describe('mandatory transfer', function () {
    it('transferring to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(
        owner,
        testERC721TokenReceiver,
        tokenIds[0],
      );
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(
        testERC721TokenReceiver,
      );
    });
    it('transferring to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await testERC721TokenReceiver.rejectTokens();
      await expect(
        landAsOwner.transferFrom(owner, testERC721TokenReceiver, tokenIds[0]),
      ).to.be.revertedWith('Receive not allowed');
    });

    it('transferring to a contract that do not return the correct onERC721Received bytes should fail', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await testERC721TokenReceiver.returnWrongBytes();
      await expect(
        landAsOwner.transferFrom(owner, testERC721TokenReceiver, tokenIds[0]),
      ).to.be.revertedWith('erc721 transfer rejected by to');
    });

    it('transferring to a contract that do not implemented mandatory receiver should not fail', async function () {
      const {landAsOwner, nonReceivingContract, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(owner, nonReceivingContract, tokenIds[0]);
    });

    it('transferring to a contract that return the correct onERC721Received bytes should succeed', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(
        owner,
        testERC721TokenReceiver,
        tokenIds[0],
      );
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(
        testERC721TokenReceiver,
      );
    });
  });

  describe('safe batch transfer', function () {
    it('safe batch transfer of same NFT ids should fails', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.safeBatchTransferFrom(
          owner,
          other,
          [tokenIds[0], tokenIds[1], tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith('not owner in batchTransferFrom');
    });
    it('safe batch transfer works', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.safeBatchTransferFrom(owner, other, tokenIds, '0x');

      // console.log('gas used for safe batch transfer = ' + receipt.gasUsed);
    });

    it('safe batch transferring to a contract that do not implemented onERC721Received should fail', async function () {
      const {landAsOwner, nonReceivingContract, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.safeBatchTransferFrom(
          owner,
          nonReceivingContract,
          tokenIds,
          '0x',
        ),
      ).to.be.revertedWithoutReason();
    });

    it('safe batch transferring to a contract that implements onERC721Received should succeed', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.safeBatchTransferFrom(
          owner,
          testERC721TokenReceiver,
          tokenIds,
          '0x',
        ),
      ).to.not.be.reverted;
      expect(await landAsOwner.balanceOf(testERC721TokenReceiver)).to.be.equal(
        tokenIds.length,
      );
    });
  });

  describe('transfer', function () {
    it('transferring one NFT results in one erc721 transfer event', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await expect(landAsOwner.transferFrom(owner, other, tokenIds[0]))
        .to.emit(landAsOwner, 'Transfer')
        .withArgs(owner, other, tokenIds[0]);
    });
    it('transferring one NFT change to correct owner', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(other);
    });

    it('transferring one NFT increase new owner balance', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      const balanceBefore = await landAsOwner.balanceOf(other);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      const balanceAfter = await landAsOwner.balanceOf(other);
      expect(balanceBefore + 1n).to.be.equal(balanceAfter);
    });

    it('transferring one NFT decrease past owner balance', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      const balanceBefore = await landAsOwner.balanceOf(owner);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      const balanceAfter = await landAsOwner.balanceOf(owner);
      expect(balanceBefore - 1n).to.be.equal(balanceAfter);
    });

    it('transferring from without approval should fails', async function () {
      const {landAsOther, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await expect(
        landAsOther.transferFrom(owner, other, tokenIds[0]),
      ).to.be.revertedWith('not approved to transfer');
    });

    it('transferring to zero address should fails', async function () {
      const {landAsOwner, owner, tokenIds} = await loadFixture(setupLandERC721);
      await expect(
        landAsOwner.transferFrom(owner, ZeroAddress, tokenIds[0]),
      ).to.be.revertedWith("can't send to zero address");
    });

    // TODO: This is right??? do not accept???
    it('transferring to a contract that do not accept erc721 token should not fail', async function () {
      const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(
        owner,
        testERC721TokenReceiver,
        tokenIds[0],
      );
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(
        testERC721TokenReceiver,
      );
    });
  });

  function testSafeTransfers(data) {
    const prefix = data ? 'data:' + data + ' : ' : '';
    let safeTransferFrom = (contract, from, to, tokenId) => {
      return contract['safeTransferFrom(address,address,uint256)'](
        from,
        to,
        tokenId,
      );
    };

    if (data) {
      safeTransferFrom = (contract, from, to, tokenId) => {
        return contract['safeTransferFrom(address,address,uint256,bytes)'](
          from,
          to,
          tokenId,
          data,
        );
      };
    }

    it(
      prefix + 'safe transferring one NFT results in one erc721 transfer event',
      async function () {
        const {landAsOwner, owner, other, tokenIds} =
          await loadFixture(setupLandERC721);
        await expect(safeTransferFrom(landAsOwner, owner, other, tokenIds[0]))
          .to.emit(landAsOwner, 'Transfer')
          .withArgs(owner, other, tokenIds[0]);
      },
    );

    it(
      prefix + 'safe transferring to zero address should fails',
      async function () {
        const {landAsOwner, owner, tokenIds} =
          await loadFixture(setupLandERC721);
        await expect(
          safeTransferFrom(landAsOwner, owner, ZeroAddress, tokenIds[0]),
        ).to.be.revertedWith("can't send to zero address");
      },
    );

    it(
      prefix + 'safe transferring one NFT change to correct owner',
      async function () {
        const {landAsOwner, owner, other, tokenIds} =
          await loadFixture(setupLandERC721);
        await safeTransferFrom(landAsOwner, owner, other, tokenIds[0]);
        expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(other);
      },
    );

    it(
      prefix + 'safe transferring from without approval should fails',
      async function () {
        const {landAsOther, owner, other, tokenIds} =
          await loadFixture(setupLandERC721);
        await expect(
          safeTransferFrom(landAsOther, owner, other, tokenIds[0]),
        ).to.be.revertedWith('not approved to transfer');
      },
    );

    it(
      prefix +
        'safe transferring to a contract that do not accept erc721 token should fail',
      async function () {
        const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
          await loadFixture(setupLandERC721);
        await testERC721TokenReceiver.rejectTokens();
        await expect(
          safeTransferFrom(
            landAsOwner,
            owner,
            testERC721TokenReceiver,
            tokenIds[0],
          ),
        ).to.be.revertedWith('Receive not allowed');
      },
    );

    it(
      prefix +
        'safe transferring to a contract that do not return the correct onERC721Received bytes should fail',
      async function () {
        const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
          await loadFixture(setupLandERC721);
        await testERC721TokenReceiver.returnWrongBytes();
        await expect(
          safeTransferFrom(
            landAsOwner,
            owner,
            testERC721TokenReceiver,
            tokenIds[0],
          ),
        ).to.be.revertedWith('ERC721: transfer rejected by to');
      },
    );

    it(
      prefix +
        'safe transferring to a contract that do not implemented onERC721Received should fail',
      async function () {
        const {landAsOwner, nonReceivingContract, owner, tokenIds} =
          await loadFixture(setupLandERC721);
        await expect(
          safeTransferFrom(
            landAsOwner,
            owner,
            nonReceivingContract,
            tokenIds[0],
          ),
        ).to.be.revertedWithoutReason();
      },
    );

    it(
      prefix +
        'safe transferring to a contract that return the correct onERC721Received bytes should succeed',
      async function () {
        const {landAsOwner, testERC721TokenReceiver, owner, tokenIds} =
          await loadFixture(setupLandERC721);
        await safeTransferFrom(
          landAsOwner,
          owner,
          testERC721TokenReceiver,
          tokenIds[0],
        );
        expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(
          testERC721TokenReceiver,
        );
      },
    );
  }

  describe('safeTransfer', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testSafeTransfers('');
  });
  describe('safeTransfer with empty bytes', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testSafeTransfers('0x');
  });
  describe('safeTransfer with data', function () {
    // eslint-disable-next-line mocha/no-setup-in-describe
    testSafeTransfers('0xff56fe3422');
  });

  describe('ERC165', function () {
    it('claim to support erc165', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      expect(await landAsOwner.supportsInterface('0x01ffc9a7')).to.be.true;
    });

    it('claim to support base erc721 interface', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      expect(await landAsOwner.supportsInterface('0x80ac58cd')).to.be.true;
    });

    it('claim to support erc721 metadata interface', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      expect(await landAsOwner.supportsInterface('0x5b5e139f')).to.be.true;
    });

    it('does not claim to support random interface', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      expect(await landAsOwner.supportsInterface('0x88888888')).to.be.false;
    });

    it('does not claim to support the invalid interface', async function () {
      const {landAsOwner} = await loadFixture(setupLandERC721);
      expect(await landAsOwner.supportsInterface('0xFFFFFFFF')).to.be.false;
    });
  });

  describe('Approval', function () {
    it('approving emit Approval event', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await expect(landAsOwner.approve(other, tokenIds[0]))
        .to.emit(landAsOwner, 'Approval')
        .withArgs(owner, other, tokenIds[0]);
    });

    it('removing approval emit Approval event', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.approve(other, tokenIds[0]);

      await expect(landAsOwner.approve(ZeroAddress, tokenIds[0]))
        .to.emit(landAsOwner, 'Approval')
        .withArgs(owner, ZeroAddress, tokenIds[0]);
    });

    it('approving update the approval status', async function () {
      const {landAsOwner, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.approve(other1, tokenIds[0]);
      expect(await landAsOwner.getApproved(tokenIds[0])).to.be.equal(other1);
    });

    it('cant approve if not owner or operator ', async function () {
      const {landAsOwner, owner, other, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      await expect(landAsOwner.approve(other, tokenIds[0])).to.be.revertedWith(
        'not authorized to approve',
      );
    });

    it('approving allows transfer from the approved party', async function () {
      const {landAsOwner, landAsOther, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.approve(other, tokenIds[0]);
      await landAsOther.transferFrom(owner, other1, tokenIds[0]);
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
    });

    it('transferring the approved NFT results in approval reset for it', async function () {
      const {landAsOwner, landAsOther1, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.approve(other1, tokenIds[0]);
      await landAsOther1.transferFrom(owner, other, tokenIds[0]);
      expect(await landAsOwner.getApproved(tokenIds[0])).to.be.equal(
        ZeroAddress,
      );
    });

    it('transferring the approved NFT again will fail', async function () {
      const {landAsOwner, landAsOther1, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.approve(other1, tokenIds[0]);
      await landAsOther1.transferFrom(owner, other, tokenIds[0]);
      await expect(
        landAsOther1.transferFrom(other, owner, tokenIds[0]),
      ).to.be.revertedWith('not approved to transfer');
    });

    it('approval by operator works', async function () {
      const {
        landAsOwner,
        landAsOther,
        landAsOther1,
        owner,
        other,
        other1,
        other2,
        tokenIds,
      } = await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      await landAsOther.setApprovalForAllFor(other, other1, true);
      // await tx(contract, 'approve', {from: other, gas}, other1, tokenId);
      await landAsOther1.transferFrom(other, other2, tokenIds[0]);
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(other2);
    });
  });

  describe('ApprovalForAll', function () {
    it('approving all emit ApprovalForAll event', async function () {
      const {landAsOwner, owner, other} = await loadFixture(setupLandERC721);
      await expect(landAsOwner.setApprovalForAll(other, true))
        .to.emit(landAsOwner, 'ApprovalForAll')
        .withArgs(owner, other, true);
    });

    it('approving all update the approval status', async function () {
      const {landAsOwner, owner, other} = await loadFixture(setupLandERC721);
      await landAsOwner.setApprovalForAll(other, true);
      expect(await landAsOwner.isApprovedForAll(owner, other)).to.be.true;
    });

    it('unsetting approval for all should update the approval status', async function () {
      const {landAsOwner, owner, other} = await loadFixture(setupLandERC721);
      await landAsOwner.setApprovalForAll(other, true);
      await landAsOwner.setApprovalForAll(other, false);
      expect(await landAsOwner.isApprovedForAll(owner, other)).to.be.false;
    });

    it('unsetting approval for all should emit ApprovalForAll event', async function () {
      const {landAsOwner, owner, other} = await loadFixture(setupLandERC721);
      await landAsOwner.setApprovalForAll(other, true);
      await expect(landAsOwner.setApprovalForAll(other, false))
        .to.emit(landAsOwner, 'ApprovalForAll')
        .withArgs(owner, other, false);
    });

    it('approving for all allows transfer from the approved party', async function () {
      const {landAsOwner, landAsOther, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.setApprovalForAll(other, true);
      await landAsOther.transferFrom(owner, other1, tokenIds[0]);
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
    });

    it('transferring one NFT do not results in aprovalForAll reset', async function () {
      const {landAsOwner, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.setApprovalForAll(other1, true);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      expect(await landAsOwner.isApprovedForAll(owner, other1)).to.be.true;
    });

    it('approval for all does not grant approval on a transfered NFT', async function () {
      const {landAsOwner, landAsOther1, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOwner.setApprovalForAll(other1, true);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      await expect(
        landAsOther1.transferFrom(other, other1, tokenIds[0]),
      ).to.be.revertedWith('not approved to transfer');
    });

    it('approval for all set before will work on a transfered NFT', async function () {
      const {landAsOwner, landAsOther, owner, other, other1, tokenIds} =
        await loadFixture(setupLandERC721);
      await landAsOther.setApprovalForAll(other1, true);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      await landAsOther.transferFrom(other, other1, tokenIds[0]);
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
    });

    it('approval for all allow to set individual nft approve', async function () {
      const {
        landAsOwner,
        landAsOther,
        landAsOther2,
        owner,
        other,
        other1,
        other2,
        tokenIds,
      } = await loadFixture(setupLandERC721);
      await landAsOwner.transferFrom(owner, other, tokenIds[0]);
      await landAsOther.setApprovalForAll(other1, true);
      await landAsOther.approve(other2, tokenIds[0]);
      await landAsOther2.transferFrom(other, other2, tokenIds[0]);
      expect(await landAsOwner.ownerOf(tokenIds[0])).to.be.equal(other2);
    });
  });
});
