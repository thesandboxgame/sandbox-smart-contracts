import {expect} from 'chai';
import {ZeroAddress} from 'ethers';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckForERC721(setupLand, Contract: string) {
  describe(Contract + ':ERC721Tests', function () {
    describe('non existing NFT', function () {
      it('transferring a non existing NFT fails', async function () {
        const {LandAsOwner, deployer, other1} = await loadFixture(setupLand);

        await expect(
          LandAsOwner.transferFrom(deployer, other1, 10000000),
        ).to.be.revertedWithCustomError(LandAsOwner, 'ERC721NonexistentToken');
      });

      it('tx balanceOf a zero owner fails', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        await expect(LandAsOwner.balanceOf(ZeroAddress))
          .to.be.revertedWithCustomError(LandAsOwner, 'ERC721InvalidOwner')
          .withArgs(ZeroAddress);
      });

      it('call balanceOf a zero owner fails', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        await expect(LandAsOwner.balanceOf.staticCall(ZeroAddress))
          .to.be.revertedWithCustomError(LandAsOwner, 'ERC721InvalidOwner')
          .withArgs(ZeroAddress);
      });

      it('tx ownerOf a non existing NFT fails', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        await expect(LandAsOwner.ownerOf(1000000000))
          .to.be.revertedWithCustomError(LandAsOwner, 'ERC721NonexistentToken')
          .withArgs(1000000000);
      });

      it('call ownerOf a non existing NFT fails', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        await expect(LandAsOwner.ownerOf.staticCall(1000000000))
          .to.be.revertedWithCustomError(LandAsOwner, 'ERC721NonexistentToken')
          .withArgs(1000000000);
      });

      it('tx getApproved a non existing NFT fails', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        await expect(
          LandAsOwner.getApproved(1000000000),
        ).to.be.revertedWithCustomError(LandAsOwner, 'ERC721NonexistentToken');
      });

      it('call getApproved a non existing NFT fails', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        await expect(
          LandAsOwner.getApproved.staticCall(1000000000),
        ).to.be.revertedWithCustomError(LandAsOwner, 'ERC721NonexistentToken');
      });
    });

    describe('balance', function () {
      it('balance is zero for new user', async function () {
        const {LandAsOwner, other} = await loadFixture(setupLand);
        const balance = await LandAsOwner.balanceOf(other);
        expect(balance).to.be.equal(0);
      });

      it('balance return correct value', async function () {
        const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        const balance = await LandAsOwner.balanceOf(other);
        expect(balance).to.be.equal(0);

        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        let newBalance = await LandAsOwner.balanceOf(other);
        expect(newBalance).to.be.equal(1);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[1]);

        newBalance = await LandAsOwner.balanceOf(other);
        expect(newBalance).to.be.equal(2);

        await LandAsOther.transferFrom(other, other1, tokenIds[0]);

        newBalance = await LandAsOwner.balanceOf(other);
        expect(newBalance).to.be.equal(1);
      });
    });

    describe('mint', function () {
      it('mint result in a transfer from 0 event', async function () {
        const {LandAsOwner, other, mint} = await loadFixture(setupLand);
        const {receipt, tokenId} = await mint(other);
        await expect(receipt)
          .to.emit(LandAsOwner, 'Transfer')
          .withArgs(ZeroAddress, other, tokenId);
      });

      it('mint for gives correct owner', async function () {
        const {LandAsOwner, other, mint} = await loadFixture(setupLand);
        const {tokenId} = await mint(other);
        expect(await LandAsOwner.ownerOf(tokenId)).to.be.equal(other);
      });
    });

    describe('burn', function () {
      it('burn result in a transfer to 0 event', async function () {
        const {LandAsOther, other, mint} = await loadFixture(setupLand);
        const {tokenId} = await mint(other);
        await expect(LandAsOther['burn(uint256)'](tokenId))
          .to.emit(LandAsOther, 'Transfer')
          .withArgs(other, ZeroAddress, tokenId);
      });

      it('burn result in ownerOf throwing', async function () {
        const {LandAsOther, other, mint} = await loadFixture(setupLand);
        const {tokenId} = await mint(other);
        await LandAsOther.ownerOf(tokenId);
        await LandAsOther['burn(uint256)'](tokenId);
        await expect(LandAsOther.ownerOf.staticCall(tokenId))
          .to.be.revertedWithCustomError(LandAsOther, 'ERC721NonexistentToken')
          .withArgs(tokenId);
      });

      it('should approve operator to burn quad', async function () {
        const {LandAsMinter, other, LandAsOther, LandAsOther1, other1} =
          await loadFixture(setupLand);

        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
        await LandAsOther.approve(other1, 0);
        await expect(LandAsOther1.burnFrom(other, 0))
          .to.emit(LandAsOther, 'Transfer')
          .withArgs(other, ZeroAddress, 0);
      });

      it('should approve operator with approvalForAll to burn quad', async function () {
        const {
          LandContract,
          LandAsAdmin,
          LandAsMinter,
          LandAsOther,
          LandAsOther1,
          deployer,
          other,
          other1,
        } = await loadFixture(setupLand);

        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
        await LandAsAdmin.setSuperOperator(deployer, true);
        await LandContract.setApprovalForAllFor(other, other1, true);

        await expect(LandAsOther1.burnFrom(other, 0))
          .to.emit(LandAsOther, 'Transfer')
          .withArgs(other, ZeroAddress, 0);
      });

      it('should revert burning tokens by unauthorized operator', async function () {
        const {LandAsMinter, other, other1, LandAsOther1} =
          await loadFixture(setupLand);

        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
        await expect(LandAsOther1.burnFrom(other, 0))
          .to.be.revertedWithCustomError(
            LandAsOther1,
            'ERC721InsufficientApproval',
          )
          .withArgs(other1, 0);
      });
    });

    describe('batchTransfer', function () {
      it('should revert batchTransfer from zero address', async function () {
        const {LandAsOwner, other, tokenIds} = await loadFixture(setupLand);
        await expect(
          LandAsOwner.batchTransferFrom(ZeroAddress, other, tokenIds, '0x'),
        ).to.be.revertedWithCustomError(LandAsOwner, 'InvalidAddress');
      });

      it('should revert batchTransfer to zero address', async function () {
        const {LandAsOwner, landOwner, tokenIds} = await loadFixture(setupLand);
        await expect(
          LandAsOwner.batchTransferFrom(landOwner, ZeroAddress, tokenIds, '0x'),
        ).to.be.revertedWithCustomError(LandAsOwner, 'InvalidAddress');
      });

      it('should revert batchTransfer from unauthorized sender', async function () {
        const {LandAsOther, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await expect(
          LandAsOther.batchTransferFrom(landOwner, other, tokenIds, '0x'),
        )
          .to.be.revertedWithCustomError(
            LandAsOther,
            'ERC721InsufficientApproval',
          )
          .withArgs(other, tokenIds[0]);
      });

      it('should batch transfer tokens from authorized sender', async function () {
        const {LandAsOwner, LandAsOther, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        expect(await LandAsOther.balanceOf(landOwner)).to.be.equal(
          tokenIds.length,
        );
        expect(await LandAsOther.balanceOf(other)).to.be.equal(0);

        await LandAsOwner.setApprovalForAll(other, true);
        await LandAsOther.batchTransferFrom(landOwner, other, tokenIds, '0x');

        expect(await LandAsOther.balanceOf(landOwner)).to.be.equal(0);
        expect(await LandAsOther.balanceOf(other)).to.be.equal(tokenIds.length);
      });

      it('should  batch transfer tokens after approval', async function () {
        const {LandAsOwner, LandAsOther, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        expect(await LandAsOther.balanceOf(landOwner)).to.be.equal(
          tokenIds.length,
        );
        expect(await LandAsOther.balanceOf(other)).to.be.equal(0);

        for (let i = 0; i < tokenIds.length; i++) {
          await LandAsOwner.approve(other, tokenIds[i]);
        }
        await LandAsOther.batchTransferFrom(landOwner, other, tokenIds, '0x');

        expect(await LandAsOther.balanceOf(landOwner)).to.be.equal(0);
        expect(await LandAsOther.balanceOf(other)).to.be.equal(tokenIds.length);
      });

      it('should not change balance for batch transfer when from and to address are same', async function () {
        const {LandAsOwner, landOwner, tokenIds} = await loadFixture(setupLand);
        expect(await LandAsOwner.balanceOf(landOwner)).to.be.equal(3);

        await LandAsOwner.batchTransferFrom(
          landOwner,
          landOwner,
          tokenIds,
          '0x',
        );
        expect(await LandAsOwner.balanceOf(landOwner)).to.be.equal(3);
      });

      it('batch transfer of same NFT ids should fails', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await expect(
          LandAsOwner.batchTransferFrom(
            landOwner,
            other,
            [tokenIds[1], tokenIds[1], tokenIds[0]],
            '0x',
          ),
        )
          .to.be.revertedWithCustomError(LandAsOwner, 'ERC721InvalidOwner')
          .withArgs(landOwner);
      });

      it('batch transfer works', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        expect(await LandAsOwner.balanceOf(other)).to.be.equal(0);
        await LandAsOwner.batchTransferFrom(landOwner, other, tokenIds, '0x');
        expect(await LandAsOwner.balanceOf(other)).to.be.equal(3);
      });
    });

    describe('mandatory batchTransfer', function () {
      it('batch transferring to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.batchTransferFrom(
          landOwner,
          TestERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        );
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(
          TestERC721TokenReceiver,
        );
      });

      it('batch transferring to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await TestERC721TokenReceiver.rejectBatchTokens();
        await expect(
          LandAsOwner.batchTransferFrom(
            landOwner,
            TestERC721TokenReceiver,
            [tokenIds[0]],
            '0x',
          ),
        ).to.be.revertedWithCustomError(
          TestERC721TokenReceiver,
          'BatchReceiveNotAllowed',
        );
      });

      it('batch transferring to a contract that do not accept erc721 token should fail', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await TestERC721TokenReceiver.rejectBatchTokens();
        await expect(
          LandAsOwner.batchTransferFrom(
            landOwner,
            TestERC721TokenReceiver,
            [tokenIds[0]],
            '0x',
          ),
        ).to.be.revertedWithCustomError(
          TestERC721TokenReceiver,
          'BatchReceiveNotAllowed',
        );
      });

      it('batch transferring to a contract that do not return the correct onERC721Received bytes should fail', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await TestERC721TokenReceiver.returnWrongBytes();
        await expect(
          LandAsOwner.batchTransferFrom(
            landOwner,
            TestERC721TokenReceiver,
            [tokenIds[0]],
            '0x',
          ),
        )
          .to.be.revertedWithCustomError(
            LandAsOwner,
            'ERC721InvalidBatchReceiver',
          )
          .withArgs(TestERC721TokenReceiver);
      });

      it('batch transferring to a contract that do not implemented mandatory receiver should not fail', async function () {
        const {LandAsOwner, landOwner, tokenIds} = await loadFixture(setupLand);
        await LandAsOwner.batchTransferFrom(
          landOwner,
          LandAsOwner,
          [tokenIds[0]],
          '0x',
        );
      });

      it('batch transferring to a contract that return the correct onERC721Received bytes should succeed', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.batchTransferFrom(
          landOwner,
          TestERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        );
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(
          TestERC721TokenReceiver,
        );
      });
    });

    describe('mandatory transfer', function () {
      it('transferring to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.transferFrom(
          landOwner,
          TestERC721TokenReceiver,
          tokenIds[0],
        );
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(
          TestERC721TokenReceiver,
        );
      });

      it('transferring to a contract that implements mandatory erc721 receiver (and signal it properly via 165) should fails if it reject it', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await TestERC721TokenReceiver.rejectTokens();
        await expect(
          LandAsOwner.transferFrom(
            landOwner,
            TestERC721TokenReceiver,
            tokenIds[0],
          ),
        ).to.be.revertedWithCustomError(
          TestERC721TokenReceiver,
          'ReceiveNotAllowed',
        );
      });

      it('transferring to a contract that do not return the correct onERC721Received bytes should fail', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await TestERC721TokenReceiver.returnWrongBytes();
        await expect(
          LandAsOwner.transferFrom(
            landOwner,
            TestERC721TokenReceiver,
            tokenIds[0],
          ),
        )
          .to.be.revertedWithCustomError(LandAsOwner, 'ERC721InvalidReceiver')
          .withArgs(TestERC721TokenReceiver);
      });

      it('transferring to a contract that do not implemented mandatory receiver should not fail', async function () {
        const {LandAsOwner, nonReceivingContract, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.transferFrom(
          landOwner,
          nonReceivingContract,
          tokenIds[0],
        );
      });

      it('transferring to a contract that return the correct onERC721Received bytes should succeed', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.transferFrom(
          landOwner,
          TestERC721TokenReceiver,
          tokenIds[0],
        );
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(
          TestERC721TokenReceiver,
        );
      });
    });

    describe('safe batch transfer', function () {
      it('safe batch transfer of same NFT ids should fails', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await expect(
          LandAsOwner.safeBatchTransferFrom(
            landOwner,
            other,
            [tokenIds[0], tokenIds[1], tokenIds[0]],
            '0x',
          ),
        )
          .to.be.revertedWithCustomError(LandAsOwner, 'ERC721InvalidOwner')
          .withArgs(landOwner);
      });

      it('safe batch transfer works', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.safeBatchTransferFrom(
          landOwner,
          other,
          tokenIds,
          '0x',
        );
      });

      it('safe batch transferring to a contract that do not implemented onERC721Received should fail', async function () {
        const {LandAsOwner, nonReceivingContract, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await expect(
          LandAsOwner.safeBatchTransferFrom(
            landOwner,
            nonReceivingContract,
            tokenIds,
            '0x',
          ),
        ).to.be.revertedWithoutReason();
      });

      it('safe batch transferring to a contract that implements onERC721Received should succeed', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await expect(
          LandAsOwner.safeBatchTransferFrom(
            landOwner,
            TestERC721TokenReceiver,
            tokenIds,
            '0x',
          ),
        ).to.not.be.reverted;
        expect(
          await LandAsOwner.balanceOf(TestERC721TokenReceiver),
        ).to.be.equal(tokenIds.length);
      });
    });

    describe('transfer', function () {
      it('transferring one NFT results in one erc721 transfer event', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await expect(LandAsOwner.transferFrom(landOwner, other, tokenIds[0]))
          .to.emit(LandAsOwner, 'Transfer')
          .withArgs(landOwner, other, tokenIds[0]);
      });

      it('transferring one NFT change to correct owner', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other);
      });

      it('transferring one NFT increase new owner balance', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        const balanceBefore = await LandAsOwner.balanceOf(other);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        const balanceAfter = await LandAsOwner.balanceOf(other);
        expect(balanceBefore + 1n).to.be.equal(balanceAfter);
      });

      it('transferring one NFT decrease past owner balance', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        const balanceBefore = await LandAsOwner.balanceOf(landOwner);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        const balanceAfter = await LandAsOwner.balanceOf(landOwner);
        expect(balanceBefore - 1n).to.be.equal(balanceAfter);
      });

      it('transferring from without approval should fails', async function () {
        const {LandAsOther, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await expect(LandAsOther.transferFrom(landOwner, other, tokenIds[0]))
          .to.be.revertedWithCustomError(
            LandAsOther,
            'ERC721InsufficientApproval',
          )
          .withArgs(other, tokenIds[0]);
      });

      it('transferring to zero address should fails', async function () {
        const {LandAsOwner, landOwner, tokenIds} = await loadFixture(setupLand);
        await expect(
          LandAsOwner.transferFrom(landOwner, ZeroAddress, tokenIds[0]),
        ).to.be.revertedWithCustomError(LandAsOwner, 'InvalidAddress');
      });

      it('transferring to a contract that accepts erc721 token should not fail', async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.transferFrom(
          landOwner,
          TestERC721TokenReceiver,
          tokenIds[0],
        );
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(
          TestERC721TokenReceiver,
        );
      });
    });

    describe('approval functionality', function () {
      // tests for approve function
      it('should revert approve for non existent token', async function () {
        const {LandAsOther, other} = await loadFixture(setupLand);
        await expect(
          LandAsOther.approve(other, 0),
        ).to.be.revertedWithCustomError(LandAsOther, 'ERC721NonexistentToken');
      });

      it('should revert approve for invalid owner', async function () {
        const {LandAsMinter, LandAsOther1, other, other1} =
          await loadFixture(setupLand);
        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');

        await expect(
          LandAsOther1.approve(other1, 0),
        ).to.be.revertedWithCustomError(LandAsOther1, 'ERC721InvalidOwner');
      });

      // tests for approveFor function
      it('should revert approveFor from zero address', async function () {
        const {LandAsOther, other1, other, LandAsMinter} =
          await loadFixture(setupLand);
        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
        await expect(
          LandAsOther.approveFor(ZeroAddress, other1, 0),
        ).to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidSender');
      });

      it('should revert approveFor for invalid owner', async function () {
        const {LandAsOther, other, deployer, other1, LandAsMinter} =
          await loadFixture(setupLand);
        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
        await expect(
          LandAsOther.approveFor(deployer, other1, 0),
        ).to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidOwner');
      });

      it('should revert approveFor for non existent token', async function () {
        const {LandAsOther, other, other1} = await loadFixture(setupLand);
        await expect(
          LandAsOther.approveFor(other, other1, 0),
        ).to.be.revertedWithCustomError(LandAsOther, 'ERC721NonexistentToken');
      });

      it('should revert approveFor from unauthorized sender', async function () {
        const {LandContract, LandAsMinter, other1, other, deployer} =
          await loadFixture(setupLand);
        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
        await expect(LandContract.approveFor(other, other1, 0))
          .to.be.revertedWithCustomError(LandContract, 'ERC721InvalidApprover')
          .withArgs(deployer);
      });

      it('should approveFor when sender is superOperator', async function () {
        const {
          LandAsAdmin,
          LandContract,
          LandAsMinter,
          deployer,
          other1,
          other,
        } = await loadFixture(setupLand);
        await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
        await LandAsAdmin.setSuperOperator(deployer, true);
        await LandContract.approveFor(other, other1, 0);
        expect(await LandContract.getApproved(0)).to.be.equal(other1);
      });

      it('should approveFor when sender is approvedForAll', async function () {
        const {
          LandContract,
          LandAsAdmin,
          LandAsMinter,
          LandAsOther,
          deployer,
          other1,
          other,
        } = await loadFixture(setupLand);
        await LandAsMinter.mintQuad(other1, 1, 0, 0, '0x');
        await LandAsAdmin.setSuperOperator(deployer, true);
        await LandContract.setApprovalForAllFor(other1, other, true);
        await LandAsOther.approveFor(other1, other1, 0);
        expect(await LandContract.getApproved(0)).to.be.equal(other1);
      });

      // tests for setApprovalForAllFor function
      it('should revert setApprovalForAllFor from zero address', async function () {
        const {LandAsOther, other1} = await loadFixture(setupLand);
        await expect(
          LandAsOther.setApprovalForAllFor(ZeroAddress, other1, true),
        ).to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidSender');
      });

      it('should revert setApprovalForAllFor from unauthorized sender', async function () {
        const {LandAsOther, other, other1, deployer} =
          await loadFixture(setupLand);
        await expect(LandAsOther.setApprovalForAllFor(deployer, other1, true))
          .to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidApprover')
          .withArgs(other);
      });

      it('should setApprovalForAllFor from authorized sender', async function () {
        const {LandContract, LandAsAdmin, other, other1, deployer} =
          await loadFixture(setupLand);
        expect(await LandContract.isApprovedForAll(other, other1)).to.be.equal(
          false,
        );
        await LandAsAdmin.setSuperOperator(deployer, true);
        await LandContract.setApprovalForAllFor(other, other1, true);
        expect(await LandContract.isApprovedForAll(other, other1)).to.be.equal(
          true,
        );
      });

      it('should revert setApprovalForAllFor when recipient is a superOperator', async function () {
        const {LandAsOther1, LandAsAdmin, other, other1} =
          await loadFixture(setupLand);
        await LandAsAdmin.setSuperOperator(other1, true);
        await expect(LandAsOther1.setApprovalForAllFor(other, other1, true))
          .to.be.revertedWithCustomError(LandAsAdmin, 'ERC721InvalidOperator')
          .withArgs(other1);
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
        prefix +
          'safe transferring one NFT results in one erc721 transfer event',
        async function () {
          const {LandAsOwner, landOwner, other, tokenIds} =
            await loadFixture(setupLand);
          await expect(
            safeTransferFrom(LandAsOwner, landOwner, other, tokenIds[0]),
          )
            .to.emit(LandAsOwner, 'Transfer')
            .withArgs(landOwner, other, tokenIds[0]);
        },
      );

      it(
        prefix + 'safe transferring to zero address should fails',
        async function () {
          const {LandAsOwner, landOwner, tokenIds} =
            await loadFixture(setupLand);
          await expect(
            safeTransferFrom(LandAsOwner, landOwner, ZeroAddress, tokenIds[0]),
          ).to.be.revertedWithCustomError(LandAsOwner, 'InvalidAddress');
        },
      );

      it(
        prefix + 'safe transferring one NFT change to correct owner',
        async function () {
          const {LandAsOwner, landOwner, other, tokenIds} =
            await loadFixture(setupLand);
          await safeTransferFrom(LandAsOwner, landOwner, other, tokenIds[0]);
          expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other);
        },
      );

      it(
        prefix + 'safe transferring from without approval should fails',
        async function () {
          const {LandAsOther, landOwner, other, tokenIds} =
            await loadFixture(setupLand);
          await expect(
            safeTransferFrom(LandAsOther, landOwner, other, tokenIds[0]),
          )
            .to.be.revertedWithCustomError(
              LandAsOther,
              'ERC721InsufficientApproval',
            )
            .withArgs(other, tokenIds[0]);
        },
      );

      it(
        prefix +
          'safe transferring to a contract that do not accept erc721 token should fail',
        async function () {
          const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
            await loadFixture(setupLand);
          await TestERC721TokenReceiver.rejectTokens();
          await expect(
            safeTransferFrom(
              LandAsOwner,
              landOwner,
              TestERC721TokenReceiver,
              tokenIds[0],
            ),
          ).to.be.revertedWithCustomError(
            TestERC721TokenReceiver,
            'ReceiveNotAllowed',
          );
        },
      );

      it(
        prefix +
          'safe transferring to a contract that do not return the correct onERC721Received bytes should fail',
        async function () {
          const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
            await loadFixture(setupLand);
          await TestERC721TokenReceiver.returnWrongBytes();
          await expect(
            safeTransferFrom(
              LandAsOwner,
              landOwner,
              TestERC721TokenReceiver,
              tokenIds[0],
            ),
          )
            .to.be.revertedWithCustomError(LandAsOwner, 'ERC721InvalidReceiver')
            .withArgs(TestERC721TokenReceiver);
        },
      );

      it(
        prefix +
          'safe transferring to a contract that do not implemented onERC721Received should fail',
        async function () {
          const {LandAsOwner, nonReceivingContract, landOwner, tokenIds} =
            await loadFixture(setupLand);
          await expect(
            safeTransferFrom(
              LandAsOwner,
              landOwner,
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
          const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
            await loadFixture(setupLand);
          await safeTransferFrom(
            LandAsOwner,
            landOwner,
            TestERC721TokenReceiver,
            tokenIds[0],
          );
          expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(
            TestERC721TokenReceiver,
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
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0x01ffc9a7')).to.be.true;
      });

      it('claim to support base erc721 interface', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0x80ac58cd')).to.be.true;
      });

      it('claim to support erc721 metadata interface', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0x5b5e139f')).to.be.true;
      });

      it('claim to support base erc721 batch interface', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0x3d127873')).to.be.true;
      });

      it('claim to support erc173 interface', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0x7f5828d0')).to.be.true;
      });

      it('claim to support royalty (erc2981) interface', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0x2a55205a')).to.be.true;
      });

      it('does not claim to support random interface', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0x88888888')).to.be.false;
      });

      it('does not claim to support the invalid interface', async function () {
        const {LandAsOwner} = await loadFixture(setupLand);
        expect(await LandAsOwner.supportsInterface('0xFFFFFFFF')).to.be.false;
      });
    });

    describe('Approval', function () {
      it('approving emit Approval event', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await expect(LandAsOwner.approve(other, tokenIds[0]))
          .to.emit(LandAsOwner, 'Approval')
          .withArgs(landOwner, other, tokenIds[0]);
      });

      it('removing approval emit Approval event', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.approve(other, tokenIds[0]);

        await expect(LandAsOwner.approve(ZeroAddress, tokenIds[0]))
          .to.emit(LandAsOwner, 'Approval')
          .withArgs(landOwner, ZeroAddress, tokenIds[0]);
      });

      it('approving update the approval status', async function () {
        const {LandAsOwner, other1, tokenIds} = await loadFixture(setupLand);
        await LandAsOwner.approve(other1, tokenIds[0]);
        expect(await LandAsOwner.getApproved(tokenIds[0])).to.be.equal(other1);
      });

      it('cant approve if not owner or operator ', async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        await expect(
          LandAsOwner.approve(other, tokenIds[0]),
        ).to.be.revertedWithCustomError(LandAsOwner, 'ERC721InvalidOwner');
      });

      it('approving allows transfer from the approved party', async function () {
        const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.approve(other, tokenIds[0]);
        await LandAsOther.transferFrom(landOwner, other1, tokenIds[0]);
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
      });

      it('transferring the approved NFT results in approval reset for it', async function () {
        const {LandAsOwner, LandAsOther1, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.approve(other1, tokenIds[0]);
        await LandAsOther1.transferFrom(landOwner, other, tokenIds[0]);
        expect(await LandAsOwner.getApproved(tokenIds[0])).to.be.equal(
          ZeroAddress,
        );
      });

      it('transferring the approved NFT again will fail', async function () {
        const {LandAsOwner, LandAsOther1, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.approve(other1, tokenIds[0]);
        await LandAsOther1.transferFrom(landOwner, other, tokenIds[0]);
        await expect(LandAsOther1.transferFrom(other, landOwner, tokenIds[0]))
          .to.be.revertedWithCustomError(
            LandAsOther1,
            'ERC721InsufficientApproval',
          )
          .withArgs(other1, tokenIds[0]);
      });

      it('approval by operator works', async function () {
        const {
          LandAsOwner,
          LandAsOther,
          LandAsOther1,
          landOwner,
          other,
          other1,
          other2,
          tokenIds,
        } = await loadFixture(setupLand);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        await LandAsOther.setApprovalForAllFor(other, other1, true);
        await LandAsOther1.transferFrom(other, other2, tokenIds[0]);
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other2);
      });
    });

    describe('ApprovalForAll', function () {
      it('approving all emit ApprovalForAll event', async function () {
        const {LandAsOwner, landOwner, other} = await loadFixture(setupLand);
        await expect(LandAsOwner.setApprovalForAll(other, true))
          .to.emit(LandAsOwner, 'ApprovalForAll')
          .withArgs(landOwner, other, true);
      });

      it('approving all update the approval status', async function () {
        const {LandAsOwner, landOwner, other} = await loadFixture(setupLand);
        await LandAsOwner.setApprovalForAll(other, true);
        expect(await LandAsOwner.isApprovedForAll(landOwner, other)).to.be.true;
      });

      it('unsetting approval for all should update the approval status', async function () {
        const {LandAsOwner, landOwner, other} = await loadFixture(setupLand);
        await LandAsOwner.setApprovalForAll(other, true);
        await LandAsOwner.setApprovalForAll(other, false);
        expect(await LandAsOwner.isApprovedForAll(landOwner, other)).to.be
          .false;
      });

      it('unsetting approval for all should emit ApprovalForAll event', async function () {
        const {LandAsOwner, landOwner, other} = await loadFixture(setupLand);
        await LandAsOwner.setApprovalForAll(other, true);
        await expect(LandAsOwner.setApprovalForAll(other, false))
          .to.emit(LandAsOwner, 'ApprovalForAll')
          .withArgs(landOwner, other, false);
      });

      it('approving for all allows transfer from the approved party', async function () {
        const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.setApprovalForAll(other, true);
        await LandAsOther.transferFrom(landOwner, other1, tokenIds[0]);
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
      });

      it('transferring one NFT do not results in aprovalForAll reset', async function () {
        const {LandAsOwner, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.setApprovalForAll(other1, true);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        expect(await LandAsOwner.isApprovedForAll(landOwner, other1)).to.be
          .true;
      });

      it('approval for all does not grant approval on a transfered NFT', async function () {
        const {LandAsOwner, LandAsOther1, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOwner.setApprovalForAll(other1, true);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        await expect(LandAsOther1.transferFrom(other, other1, tokenIds[0]))
          .to.be.revertedWithCustomError(
            LandAsOwner,
            'ERC721InsufficientApproval',
          )
          .withArgs(other1, tokenIds[0]);
      });

      it('approval for all set before will work on a transfered NFT', async function () {
        const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
          await loadFixture(setupLand);
        await LandAsOther.setApprovalForAll(other1, true);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        await LandAsOther.transferFrom(other, other1, tokenIds[0]);
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
      });

      it('approval for all allow to set individual nft approve', async function () {
        const {
          LandAsOwner,
          LandAsOther,
          LandAsOther2,
          landOwner,
          other,
          other1,
          other2,
          tokenIds,
        } = await loadFixture(setupLand);
        await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
        await LandAsOther.setApprovalForAll(other1, true);
        await LandAsOther.approve(other2, tokenIds[0]);
        await LandAsOther2.transferFrom(other, other2, tokenIds[0]);
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other2);
      });
    });
  });
}
