import {expect} from 'chai';
import {ZeroAddress} from 'ethers';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {deploy, setupLandContract, setupPolygonLandContract} from './fixtures';

async function setupLandTests() {
  const ret = await setupLandContract();

  let x = 0;

  async function mint(to) {
    const bytes = '0x3333';
    const GRID_SIZE = 408;
    x = ++x;
    const y = 0;
    const size = 1;
    const tokenId = x + y * GRID_SIZE;
    const receipt = await ret.LandAsMinter.mintQuad(to, size, x, y, bytes);
    return {receipt, tokenId};
  }

  const tokenIds = [];
  for (let i = 0; i < 3; i++) {
    const {tokenId} = await mint(ret.landOwner);
    tokenIds.push(tokenId);
  }
  const [nonReceivingContract] = await deploy('ContractMock', [ret.deployer]);
  return {nonReceivingContract, tokenIds, mint, ...ret};
}

async function setupPolygonLandTests() {
  const ret = await setupPolygonLandContract();

  let x = 0;

  async function mint(to) {
    const bytes = '0x3333';
    const GRID_SIZE = 408;
    x = ++x;
    const y = 0;
    const size = 1;
    const tokenId = x + y * GRID_SIZE;
    const receipt = await ret.LandAsMinter.mintQuad(to, size, x, y, bytes);
    return {receipt, tokenId};
  }

  const tokenIds = [];
  for (let i = 0; i < 3; i++) {
    const {tokenId} = await mint(ret.landOwner);
    tokenIds.push(tokenId);
  }
  const [nonReceivingContract] = await deploy('ContractMock', [ret.deployer]);
  return {nonReceivingContract, tokenIds, mint, ...ret};
}

function addTests(setup, errorMessages) {
  describe('non existing NFT', function () {
    it('transferring a non existing NFT fails', async function () {
      const {LandAsOwner, deployer, other1} = await loadFixture(setup);

      await expect(
        LandAsOwner.transferFrom(deployer, other1, 10000000),
      ).to.be.revertedWith(errorMessages.NONEXISTENT_TOKEN);
    });

    it('tx balanceOf a zero owner fails', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      await expect(LandAsOwner.balanceOf(ZeroAddress)).to.be.revertedWith(
        errorMessages.ZERO_ADDRESS_OWNER,
      );
    });

    it('call balanceOf a zero owner fails', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      await expect(
        LandAsOwner.balanceOf.staticCall(ZeroAddress),
      ).to.be.revertedWith(errorMessages.ZERO_ADDRESS_OWNER);
    });

    it('tx ownerOf a non existing NFT fails', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      await expect(LandAsOwner.ownerOf(1000000000)).to.be.revertedWith(
        errorMessages.NONEXISTANT_TOKEN,
      );
    });

    it('call ownerOf a non existing NFT fails', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      await expect(
        LandAsOwner.ownerOf.staticCall(1000000000),
      ).to.be.revertedWith(errorMessages.NONEXISTANT_TOKEN);
    });

    it('tx getApproved a non existing NFT fails', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      await expect(LandAsOwner.getApproved(1000000000)).to.be.revertedWith(
        errorMessages.NONEXISTENT_TOKEN,
      );
    });

    it('call getApproved a non existing NFT fails', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      await expect(
        LandAsOwner.getApproved.staticCall(1000000000),
      ).to.be.revertedWith(errorMessages.NONEXISTENT_TOKEN);
    });
  });

  describe('balance', function () {
    it('balance is zero for new user', async function () {
      const {LandAsOwner, other} = await loadFixture(setup);
      const balance = await LandAsOwner.balanceOf(other);
      expect(balance).to.be.equal(0);
    });

    it('balance return correct value', async function () {
      const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
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
      const {LandAsOwner, other, mint} = await loadFixture(setup);
      const {receipt, tokenId} = await mint(other);
      await expect(receipt)
        .to.emit(LandAsOwner, 'Transfer')
        .withArgs(ZeroAddress, other, tokenId);
    });

    it('mint for gives correct owner', async function () {
      const {LandAsOwner, other, mint} = await loadFixture(setup);
      const {tokenId} = await mint(other);
      expect(await LandAsOwner.ownerOf(tokenId)).to.be.equal(other);
    });
  });

  describe('burn', function () {
    it('burn result in a transfer to 0 event', async function () {
      const {LandAsOther, other, mint} = await loadFixture(setup);
      const {tokenId} = await mint(other);
      await expect(LandAsOther['burn(uint256)'](tokenId))
        .to.emit(LandAsOther, 'Transfer')
        .withArgs(other, ZeroAddress, tokenId);
    });
    it('burn result in ownerOf throwing', async function () {
      const {LandAsOther, other, mint} = await loadFixture(setup);
      const {tokenId} = await mint(other);
      await LandAsOther.ownerOf(tokenId);
      await LandAsOther['burn(uint256)'](tokenId);
      await expect(LandAsOther.ownerOf.staticCall(tokenId)).to.be.revertedWith(
        errorMessages.NONEXISTANT_TOKEN,
      );
    });
  });

  describe('batchTransfer', function () {
    it('batch transfer of same NFT ids should fails', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await expect(
        LandAsOwner.batchTransferFrom(
          landOwner,
          other,
          [tokenIds[1], tokenIds[1], tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith(errorMessages.BATCHTRANSFERFROM_NOT_OWNER);
    });
    it('batch transfer works', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      expect(await LandAsOwner.balanceOf(other)).to.be.equal(0);
      await LandAsOwner.batchTransferFrom(landOwner, other, tokenIds, '0x');
      expect(await LandAsOwner.balanceOf(other)).to.be.equal(3);
    });
  });

  describe('mandatory batchTransfer', function () {
    it('batch transferring to a contract that do not implements mandatory erc721 receiver but implement classic ERC721 receiver and reject should not fails', async function () {
      const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
        await loadFixture(setup);
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
        await loadFixture(setup);
      await TestERC721TokenReceiver.rejectBatchTokens();
      await expect(
        LandAsOwner.batchTransferFrom(
          landOwner,
          TestERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith('Batch Receive not allowed');
    });
    it('batch transferring to a contract that do not accept erc721 token should fail', async function () {
      const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
        await loadFixture(setup);
      await TestERC721TokenReceiver.rejectBatchTokens();
      await expect(
        LandAsOwner.batchTransferFrom(
          landOwner,
          TestERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith('Batch Receive not allowed');
    });

    it('batch transferring to a contract that do not return the correct onERC721Received bytes should fail', async function () {
      const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
        await loadFixture(setup);
      await TestERC721TokenReceiver.returnWrongBytes();
      await expect(
        LandAsOwner.batchTransferFrom(
          landOwner,
          TestERC721TokenReceiver,
          [tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith(errorMessages.ERC721_BATCH_RECEIVED_REJECTED);
    });

    it('batch transferring to a contract that do not implemented mandatory receiver should not fail', async function () {
      const {LandAsOwner, landOwner, tokenIds} = await loadFixture(setup);
      await LandAsOwner.batchTransferFrom(
        landOwner,
        LandAsOwner,
        [tokenIds[0]],
        '0x',
      );
    });

    it('batch transferring to a contract that return the correct onERC721Received bytes should succeed', async function () {
      const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
        await loadFixture(setup);
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
        await loadFixture(setup);
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
        await loadFixture(setup);
      await TestERC721TokenReceiver.rejectTokens();
      await expect(
        LandAsOwner.transferFrom(
          landOwner,
          TestERC721TokenReceiver,
          tokenIds[0],
        ),
      ).to.be.revertedWith('Receive not allowed');
    });

    it('transferring to a contract that do not return the correct onERC721Received bytes should fail', async function () {
      const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
        await loadFixture(setup);
      await TestERC721TokenReceiver.returnWrongBytes();
      await expect(
        LandAsOwner.transferFrom(
          landOwner,
          TestERC721TokenReceiver,
          tokenIds[0],
        ),
      ).to.be.revertedWith(errorMessages.ERC721_TRANSFER_REJECTED);
    });

    it('transferring to a contract that do not implemented mandatory receiver should not fail', async function () {
      const {LandAsOwner, nonReceivingContract, landOwner, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.transferFrom(
        landOwner,
        nonReceivingContract,
        tokenIds[0],
      );
    });

    it('transferring to a contract that return the correct onERC721Received bytes should succeed', async function () {
      const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
        await loadFixture(setup);
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
        await loadFixture(setup);
      await expect(
        LandAsOwner.safeBatchTransferFrom(
          landOwner,
          other,
          [tokenIds[0], tokenIds[1], tokenIds[0]],
          '0x',
        ),
      ).to.be.revertedWith(errorMessages.BATCHTRANSFERFROM_NOT_OWNER);
    });
    it('safe batch transfer works', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.safeBatchTransferFrom(landOwner, other, tokenIds, '0x');

      // console.log('gas used for safe batch transfer = ' + receipt.gasUsed);
    });

    it('safe batch transferring to a contract that do not implemented onERC721Received should fail', async function () {
      const {LandAsOwner, nonReceivingContract, landOwner, tokenIds} =
        await loadFixture(setup);
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
        await loadFixture(setup);
      await expect(
        LandAsOwner.safeBatchTransferFrom(
          landOwner,
          TestERC721TokenReceiver,
          tokenIds,
          '0x',
        ),
      ).to.not.be.reverted;
      expect(await LandAsOwner.balanceOf(TestERC721TokenReceiver)).to.be.equal(
        tokenIds.length,
      );
    });
  });

  describe('transfer', function () {
    it('transferring one NFT results in one erc721 transfer event', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await expect(LandAsOwner.transferFrom(landOwner, other, tokenIds[0]))
        .to.emit(LandAsOwner, 'Transfer')
        .withArgs(landOwner, other, tokenIds[0]);
    });
    it('transferring one NFT change to correct owner', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other);
    });

    it('transferring one NFT increase new owner balance', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      const balanceBefore = await LandAsOwner.balanceOf(other);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      const balanceAfter = await LandAsOwner.balanceOf(other);
      expect(balanceBefore + 1n).to.be.equal(balanceAfter);
    });

    it('transferring one NFT decrease past owner balance', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      const balanceBefore = await LandAsOwner.balanceOf(landOwner);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      const balanceAfter = await LandAsOwner.balanceOf(landOwner);
      expect(balanceBefore - 1n).to.be.equal(balanceAfter);
    });

    it('transferring from without approval should fails', async function () {
      const {LandAsOther, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await expect(
        LandAsOther.transferFrom(landOwner, other, tokenIds[0]),
      ).to.be.revertedWith(errorMessages.UNAUTHORIZED_TRANSFER);
    });

    it('transferring to zero address should fails', async function () {
      const {LandAsOwner, landOwner, tokenIds} = await loadFixture(setup);
      await expect(
        LandAsOwner.transferFrom(landOwner, ZeroAddress, tokenIds[0]),
      ).to.be.revertedWith(errorMessages.NOT_TO_ZEROADDRESS);
    });

    // TODO: This is right??? do not accept???
    it('transferring to a contract that do not accept erc721 token should not fail', async function () {
      const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
        await loadFixture(setup);
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
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setup);
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
        const {LandAsOwner, landOwner, tokenIds} = await loadFixture(setup);
        await expect(
          safeTransferFrom(LandAsOwner, landOwner, ZeroAddress, tokenIds[0]),
        ).to.be.revertedWith(errorMessages.NOT_TO_ZEROADDRESS);
      },
    );

    it(
      prefix + 'safe transferring one NFT change to correct owner',
      async function () {
        const {LandAsOwner, landOwner, other, tokenIds} =
          await loadFixture(setup);
        await safeTransferFrom(LandAsOwner, landOwner, other, tokenIds[0]);
        expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other);
      },
    );

    it(
      prefix + 'safe transferring from without approval should fails',
      async function () {
        const {LandAsOther, landOwner, other, tokenIds} =
          await loadFixture(setup);
        await expect(
          safeTransferFrom(LandAsOther, landOwner, other, tokenIds[0]),
        ).to.be.revertedWith(errorMessages.UNAUTHORIZED_TRANSFER);
      },
    );

    it(
      prefix +
        'safe transferring to a contract that do not accept erc721 token should fail',
      async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setup);
        await TestERC721TokenReceiver.rejectTokens();
        await expect(
          safeTransferFrom(
            LandAsOwner,
            landOwner,
            TestERC721TokenReceiver,
            tokenIds[0],
          ),
        ).to.be.revertedWith('Receive not allowed');
      },
    );

    it(
      prefix +
        'safe transferring to a contract that do not return the correct onERC721Received bytes should fail',
      async function () {
        const {LandAsOwner, TestERC721TokenReceiver, landOwner, tokenIds} =
          await loadFixture(setup);
        await TestERC721TokenReceiver.returnWrongBytes();
        await expect(
          safeTransferFrom(
            LandAsOwner,
            landOwner,
            TestERC721TokenReceiver,
            tokenIds[0],
          ),
        ).to.be.revertedWith(errorMessages.ERC721_TRANSFER_REJECTED2);
      },
    );

    it(
      prefix +
        'safe transferring to a contract that do not implemented onERC721Received should fail',
      async function () {
        const {LandAsOwner, nonReceivingContract, landOwner, tokenIds} =
          await loadFixture(setup);
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
          await loadFixture(setup);
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
      const {LandAsOwner} = await loadFixture(setup);
      expect(await LandAsOwner.supportsInterface('0x01ffc9a7')).to.be.true;
    });

    it('claim to support base erc721 interface', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      expect(await LandAsOwner.supportsInterface('0x80ac58cd')).to.be.true;
    });

    it('claim to support erc721 metadata interface', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      expect(await LandAsOwner.supportsInterface('0x5b5e139f')).to.be.true;
    });

    it('does not claim to support random interface', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      expect(await LandAsOwner.supportsInterface('0x88888888')).to.be.false;
    });

    it('does not claim to support the invalid interface', async function () {
      const {LandAsOwner} = await loadFixture(setup);
      expect(await LandAsOwner.supportsInterface('0xFFFFFFFF')).to.be.false;
    });
  });

  describe('Approval', function () {
    it('approving emit Approval event', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await expect(LandAsOwner.approve(other, tokenIds[0]))
        .to.emit(LandAsOwner, 'Approval')
        .withArgs(landOwner, other, tokenIds[0]);
    });

    it('removing approval emit Approval event', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.approve(other, tokenIds[0]);

      await expect(LandAsOwner.approve(ZeroAddress, tokenIds[0]))
        .to.emit(LandAsOwner, 'Approval')
        .withArgs(landOwner, ZeroAddress, tokenIds[0]);
    });

    it('approving update the approval status', async function () {
      const {LandAsOwner, other1, tokenIds} = await loadFixture(setup);
      await LandAsOwner.approve(other1, tokenIds[0]);
      expect(await LandAsOwner.getApproved(tokenIds[0])).to.be.equal(other1);
    });

    it('cant approve if not owner or operator ', async function () {
      const {LandAsOwner, landOwner, other, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      await expect(LandAsOwner.approve(other, tokenIds[0])).to.be.revertedWith(
        errorMessages.UNAUTHORIZED_APPROVAL,
      );
    });

    it('approving allows transfer from the approved party', async function () {
      const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.approve(other, tokenIds[0]);
      await LandAsOther.transferFrom(landOwner, other1, tokenIds[0]);
      expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
    });

    it('transferring the approved NFT results in approval reset for it', async function () {
      const {LandAsOwner, LandAsOther1, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.approve(other1, tokenIds[0]);
      await LandAsOther1.transferFrom(landOwner, other, tokenIds[0]);
      expect(await LandAsOwner.getApproved(tokenIds[0])).to.be.equal(
        ZeroAddress,
      );
    });

    it('transferring the approved NFT again will fail', async function () {
      const {LandAsOwner, LandAsOther1, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.approve(other1, tokenIds[0]);
      await LandAsOther1.transferFrom(landOwner, other, tokenIds[0]);
      await expect(
        LandAsOther1.transferFrom(other, landOwner, tokenIds[0]),
      ).to.be.revertedWith(errorMessages.UNAUTHORIZED_TRANSFER);
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
      } = await loadFixture(setup);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      await LandAsOther.setApprovalForAllFor(other, other1, true);
      // await tx(contract, 'approve', {from: other, gas}, other1, tokenId);
      await LandAsOther1.transferFrom(other, other2, tokenIds[0]);
      expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other2);
    });
  });

  describe('ApprovalForAll', function () {
    it('approving all emit ApprovalForAll event', async function () {
      const {LandAsOwner, landOwner, other} = await loadFixture(setup);
      await expect(LandAsOwner.setApprovalForAll(other, true))
        .to.emit(LandAsOwner, 'ApprovalForAll')
        .withArgs(landOwner, other, true);
    });

    it('approving all update the approval status', async function () {
      const {LandAsOwner, landOwner, other} = await loadFixture(setup);
      await LandAsOwner.setApprovalForAll(other, true);
      expect(await LandAsOwner.isApprovedForAll(landOwner, other)).to.be.true;
    });

    it('unsetting approval for all should update the approval status', async function () {
      const {LandAsOwner, landOwner, other} = await loadFixture(setup);
      await LandAsOwner.setApprovalForAll(other, true);
      await LandAsOwner.setApprovalForAll(other, false);
      expect(await LandAsOwner.isApprovedForAll(landOwner, other)).to.be.false;
    });

    it('unsetting approval for all should emit ApprovalForAll event', async function () {
      const {LandAsOwner, landOwner, other} = await loadFixture(setup);
      await LandAsOwner.setApprovalForAll(other, true);
      await expect(LandAsOwner.setApprovalForAll(other, false))
        .to.emit(LandAsOwner, 'ApprovalForAll')
        .withArgs(landOwner, other, false);
    });

    it('approving for all allows transfer from the approved party', async function () {
      const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.setApprovalForAll(other, true);
      await LandAsOther.transferFrom(landOwner, other1, tokenIds[0]);
      expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other1);
    });

    it('transferring one NFT do not results in aprovalForAll reset', async function () {
      const {LandAsOwner, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.setApprovalForAll(other1, true);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      expect(await LandAsOwner.isApprovedForAll(landOwner, other1)).to.be.true;
    });

    it('approval for all does not grant approval on a transfered NFT', async function () {
      const {LandAsOwner, LandAsOther1, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
      await LandAsOwner.setApprovalForAll(other1, true);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      await expect(
        LandAsOther1.transferFrom(other, other1, tokenIds[0]),
      ).to.be.revertedWith(errorMessages.UNAUTHORIZED_TRANSFER);
    });

    it('approval for all set before will work on a transfered NFT', async function () {
      const {LandAsOwner, LandAsOther, landOwner, other, other1, tokenIds} =
        await loadFixture(setup);
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
      } = await loadFixture(setup);
      await LandAsOwner.transferFrom(landOwner, other, tokenIds[0]);
      await LandAsOther.setApprovalForAll(other1, true);
      await LandAsOther.approve(other2, tokenIds[0]);
      await LandAsOther2.transferFrom(other, other2, tokenIds[0]);
      //   expect(await LandAsOwner.ownerOf(tokenIds[0])).to.be.equal(other2);
    });
  });
}

describe('ERC721 tests', function () {
  describe('Land', function () {
    async function setup() {
      return setupLandTests();
    }

    const LandErrorMessages = {
      NONEXISTENT_TOKEN: 'token does not exist',
      NONEXISTANT_TOKEN: 'token does not exist',
      ZERO_ADDRESS_OWNER: 'owner is zero address',
      BATCHTRANSFERFROM_NOT_OWNER: 'not owner in batchTransferFrom',
      ERC721_BATCH_RECEIVED_REJECTED: 'erc721 batchTransfer rejected',
      ERC721_TRANSFER_REJECTED: 'erc721 transfer rejected by to',
      // TODO: FIX contract
      ERC721_TRANSFER_REJECTED2: 'ERC721: transfer rejected by to',
      UNAUTHORIZED_TRANSFER: 'not approved to transfer',
      NOT_TO_ZEROADDRESS: "can't send to zero address",
      UNAUTHORIZED_APPROVAL: 'not authorized to approve',
    };
    // eslint-disable-next-line mocha/no-setup-in-describe
    addTests(setup, LandErrorMessages);
  });

  describe('PolygonLand', function () {
    async function setup() {
      return setupPolygonLandTests();
    }

    const PolygonLandErrorMessages = {
      NONEXISTENT_TOKEN: 'NONEXISTENT_TOKEN',
      // TODO: Fix typo in the contract (or even better error message)
      NONEXISTANT_TOKEN: 'NONEXISTANT_TOKEN',
      ZERO_ADDRESS_OWNER: 'ZERO_ADDRESS_OWNER',
      BATCHTRANSFERFROM_NOT_OWNER: 'BATCHTRANSFERFROM_NOT_OWNER',
      ERC721_BATCH_RECEIVED_REJECTED: 'ERC721_BATCH_RECEIVED_REJECTED',
      ERC721_TRANSFER_REJECTED: 'ERC721_TRANSFER_REJECTED',
      ERC721_TRANSFER_REJECTED2: 'ERC721_TRANSFER_REJECTED',
      UNAUTHORIZED_TRANSFER: 'UNAUTHORIZED_TRANSFER',
      NOT_TO_ZEROADDRESS: 'NOT_TO_ZEROADDRESS',
      UNAUTHORIZED_APPROVAL: 'UNAUTHORIZED_APPROVAL',
    };
    // eslint-disable-next-line mocha/no-setup-in-describe
    addTests(setup, PolygonLandErrorMessages);
  });
});
