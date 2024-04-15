import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {
  getId,
  setupPolygonLandForERC721Tests,
  setupPolygonLandOperatorFilter,
} from '../fixtures';
import {setupPolygonLand, setupPolygonLandMock} from './fixtures';
import {ZeroAddress} from 'ethers';
import {shouldCheckForRoyalty} from '../common/Royalty.behavior';
import {shouldCheckForAdmin} from '../common/WithAdmin.behavior';
import {shouldCheckForSuperOperators} from '../common/WithSuperOperators.behavior';
import {shouldCheckForOperatorFilter} from '../common/OperatorFilter.behavior';
import {shouldCheckLandGetter} from '../common/LandGetter.behavior';
import {shouldCheckMintQuad} from '../common/MintQuad.behavior';
import {shouldCheckTransferQuad} from '../common/TransferQuad.behavior';
import {shouldCheckTransferFrom} from '../common/TransferFrom.behavior';
import {landConfig} from '../common/Config.behavior';
import {shouldCheckForERC721} from '../common/ERC721.behavior';
import {setupLand} from '../mainnet/fixtures';
import {gasAndSizeChecks} from '../common/gasAndSizeChecks.behavior';

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

const PolygonLandErrorMessages = {
  NONEXISTENT_TOKEN: 'NONEXISTENT_TOKEN',
  BATCHTRANSFERFROM_NOT_OWNER: 'BATCHTRANSFERFROM_NOT_OWNER',
  ERC721_BATCH_RECEIVED_REJECTED: 'ERC721_BATCH_RECEIVED_REJECTED',
  ERC721_TRANSFER_REJECTED: 'ERC721_TRANSFER_REJECTED',
  UNAUTHORIZED_TRANSFER: 'UNAUTHORIZED_TRANSFER',
  NOT_TO_ZEROADDRESS: 'NOT_TO_ZEROADDRESS',
  UNAUTHORIZED_APPROVAL: 'UNAUTHORIZED_APPROVAL',
};

// TODO: some test were testing the tunnel => not anymore. We need to check if we missed something.
describe('PolygonLand.sol', function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  gasAndSizeChecks(setupLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForRoyalty(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForAdmin(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForSuperOperators(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForOperatorFilter(setupPolygonLandOperatorFilter, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckLandGetter(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckMintQuad(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckTransferQuad(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckTransferFrom(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  landConfig(setupPolygonLand, 'PolygonLand');

  // eslint-disable-next-line mocha/no-setup-in-describe
  shouldCheckForERC721(
    setupPolygonLandForERC721Tests,
    PolygonLandErrorMessages,
    'PolygonLand',
  );

  it('should return the name of the token contract', async function () {
    const {LandContract} = await loadFixture(setupPolygonLand);
    expect(await LandContract.name()).to.be.equal("Sandbox's LANDs");
  });

  it('should return the symbol of the token contract', async function () {
    const {LandContract} = await loadFixture(setupPolygonLand);
    expect(await LandContract.symbol()).to.be.equal('LAND');
  });

  it('should not accept zero address as landMinter', async function () {
    const {LandAsAdmin} = await loadFixture(setupPolygonLand);

    await expect(
      LandAsAdmin.setMinter('0x0000000000000000000000000000000000000000', true),
    ).to.be.revertedWith('address 0 is not allowed');
  });

  it(`reverts check URI for non existing token`, async function () {
    const GRID_SIZE = 408;
    const {LandContract} = await loadFixture(setupPolygonLand);

    const tokenId = 2 + 2 * GRID_SIZE;
    await expect(LandContract.tokenURI(tokenId)).to.be.revertedWith(
      'Id does not exist',
    );
  });

  it('should revert if signer is not landMinter (mintAndTransferQuad)', async function () {
    const {LandAsOther, other} = await loadFixture(setupPolygonLand);

    await expect(
      LandAsOther.mintAndTransferQuad(other, 3, 0, 0, '0x'),
    ).to.be.revertedWith('!AUTHORIZED');
  });

  it('should revert for transfer if to address zero (mintAndTransferQuad)', async function () {
    const {LandAsAdmin, LandContract, deployer} =
      await loadFixture(setupPolygonLand);
    const bytes = '0x3333';
    await LandAsAdmin.setMinter(deployer, true);
    await expect(
      LandContract.mintAndTransferQuad(ZeroAddress, 3, 3, 3, bytes),
    ).to.be.revertedWith('to is zero address');
  });

  it('should revert approveFor for ZeroAddress spender', async function () {
    const {LandAsMinter, LandAsOther, MockMarketPlace3, other} =
      await loadFixture(setupPolygonLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await expect(
      LandAsOther.approveFor(ZeroAddress, MockMarketPlace3, id),
    ).to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidSender');
  });

  it('should revert approveFor for unauthorized user', async function () {
    const {LandAsMinter, LandAsOther, MockMarketPlace3, other, other1} =
      await loadFixture(setupPolygonLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await expect(
      LandAsOther.approveFor(other1, MockMarketPlace3, id),
    ).to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidOwner');
  });

  it('should revert approveFor zero owner of tokenId', async function () {
    const {LandAsOther, MockMarketPlace3, other} =
      await loadFixture(setupPolygonLand);
    const GRID_SIZE = 408;
    const tokenId = 2 + 2 * GRID_SIZE;
    await expect(
      LandAsOther.approveFor(other, MockMarketPlace3, tokenId),
    ).to.be.revertedWithCustomError(LandAsOther, 'ERC721NonexistentToken');
  });

  it('should revert approve for zero address owner of token', async function () {
    const {LandAsOther, MockMarketPlace3} = await loadFixture(setupPolygonLand);
    const GRID_SIZE = 408;
    const tokenId = 2 + 2 * GRID_SIZE;
    console.log(await MockMarketPlace3.getAddress());
    await expect(
      LandAsOther.approve(MockMarketPlace3, tokenId),
    ).to.be.revertedWithCustomError(LandAsOther, 'ERC721NonexistentToken');
  });

  it('should revert approve for ZeroAddress spender', async function () {
    const {LandAsMinter, LandAsOther1, MockMarketPlace3, other} =
      await loadFixture(setupPolygonLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await expect(
      LandAsOther1.approve(MockMarketPlace3, id),
    ).to.be.revertedWithCustomError(LandAsOther1, 'ERC721InvalidOwner');
  });

  it('should revert setApprovalForAllFor for ZeroAddress', async function () {
    const {LandAsOther, MockMarketPlace3} = await loadFixture(setupPolygonLand);
    await expect(
      LandAsOther.setApprovalForAllFor(ZeroAddress, MockMarketPlace3, true),
    ).to.be.revertedWithCustomError(LandAsOther, 'ERC721InvalidSender');
  });

  it('should revert setApprovalForAllFor for unauthorized users', async function () {
    const {LandAsOther, MockMarketPlace3} = await loadFixture(setupPolygonLand);
    await expect(
      LandAsOther.setApprovalForAllFor(
        MockMarketPlace3,
        MockMarketPlace3,
        true,
      ),
    ).to.be.revertedWith('UNAUTHORIZED_APPROVE_FOR_ALL');
  });

  it('should revert approvalFor for same sender and spender', async function () {
    const {LandContract, LandAsMinter, deployer, other} =
      await loadFixture(setupPolygonLand);
    await LandAsMinter.mintQuad(other, 1, 0, 0, '0x');
    const id = getId(1, 0, 0);
    await expect(
      LandContract.approveFor(deployer, deployer, id),
    ).to.be.revertedWithCustomError(LandContract, 'ERC721InvalidOwner');
  });

  it('subscription can not be zero address', async function () {
    const {LandAsAdmin} = await loadFixture(setupPolygonLand);
    await expect(LandAsAdmin.register(ZeroAddress, true)).to.be.revertedWith(
      "subscription can't be zero",
    );
  });

  it('supported interfaces', async function () {
    const {LandAsAdmin} = await loadFixture(setupPolygonLand);

    expect(await LandAsAdmin.supportsInterface('0x01ffc9a7')).to.be.true;
    expect(await LandAsAdmin.supportsInterface('0x80ac58cd')).to.be.true;
    expect(await LandAsAdmin.supportsInterface('0x5b5e139f')).to.be.true;
  });

  it('should revert for incorrect id (wrong size)', async function () {
    const {LandAsAdmin} = await loadFixture(setupPolygonLand);

    await expect(LandAsAdmin.ownerOf(getId(9, 0, 0))).to.be.revertedWith(
      'Invalid token id',
    );
  });

  it('should revert if signer is not landMinter', async function () {
    const {LandAsOther, other} = await loadFixture(setupPolygonLand);

    await expect(LandAsOther.mintQuad(other, 3, 0, 0, '0x')).to.be.revertedWith(
      '!AUTHORIZED',
    );
  });

  it('should return correct ownerOf 1*1 quad minted', async function () {
    const {LandAsMinter, deployer} = await loadFixture(setupPolygonLand);
    const bytes = '0x3333';
    await LandAsMinter.mintQuad(deployer, 1, 1, 1, bytes);
    expect(await LandAsMinter.ownerOf(getId(1, 1, 1))).to.be.equal(deployer);
  });

  it('changes the admin to a new address via meta transaction', async function () {
    const {LandAsAdmin, landAdmin, deployer, sendMetaTx} =
      await loadFixture(setupPolygonLand);
    const {to, data} =
      await LandAsAdmin.changeAdmin.populateTransaction(deployer);
    await sendMetaTx(landAdmin, to, data);
    expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
  });

  it('should emit RoyaltyManagerSet event', async function () {
    const {LandAsAdmin, other} = await loadFixture(setupPolygonLand);
    const tx = await LandAsAdmin.setRoyaltyManager(await other.getAddress());
    await expect(tx)
      .to.emit(LandAsAdmin, 'RoyaltyManagerSet')
      .withArgs(await other.getAddress());
  });

  it('should emit OwnershipTransferred event', async function () {
    const {LandAsAdmin, other, landOwner} = await loadFixture(setupPolygonLand);
    const tx = await LandAsAdmin.transferOwnership(await other.getAddress());
    await expect(tx)
      .to.emit(LandAsAdmin, 'OwnershipTransferred')
      .withArgs(await landOwner.getAddress(), await other.getAddress());
  });

  it('should reverts transfers batch of quads when from is zero address', async function () {
    const {LandContract, other} = await loadFixture(setupPolygonLand);

    const bytes = '0x3333';
    await expect(
      LandContract.batchTransferQuad(
        '0x0000000000000000000000000000000000000000',
        other,
        [24, 12, 6, 3],
        [0, 300, 30, 24],
        [0, 300, 30, 24],
        bytes,
      ),
    ).to.be.revertedWith('invalid from');
  });

  it('Transfer 1x1 without approval', async function () {
    const {LandContract, LandAsMinter, deployer, other} =
      await loadFixture(setupPolygonLand);

    const bytes = '0x3333';
    await LandAsMinter.mintQuad(other, 1, 0, 0, bytes);

    await expect(
      LandContract.transferFrom(other, deployer, 0),
    ).to.be.revertedWith('UNAUTHORIZED_TRANSFER');
  });

  it('check storage structure', async function () {
    const {landContract} = await loadFixture(setupPolygonLandMock);
    const slots = await landContract.getStorageStructure();
    expect(slots._admin).to.be.equal(51);
    expect(slots._superOperators).to.be.equal(52);
    expect(slots._numNFTPerAddress).to.be.equal(53);
    expect(slots._owners).to.be.equal(54);
    expect(slots._operatorsForAll).to.be.equal(55);
    expect(slots._operators).to.be.equal(56);
    expect(slots._minters).to.be.equal(57);
    expect(slots._trustedForwarder).to.be.equal(107);
    expect(slots.operatorFilterRegistry).to.be.equal(108);
  });

  describe('Meta transactions', function () {
    describe('transferQuad without approval', function () {
      it('should not transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {LandAsMinter, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          const landHolder = other;
          const landReceiver = other1;
          // Mint LAND on L1
          await LandAsMinter.mintQuad(landHolder, size, x, y, bytes);
          expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );

          const {to, data} = await LandAsMinter[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ].populateTransaction(landHolder, landReceiver, size, x, y, bytes);

          await expect(sendMetaTx(landReceiver, to, data)).to.revertedWith(
            'not authorized to transferQuad',
          );
          expect(await LandAsMinter.balanceOf(landReceiver)).to.be.equal(0);
          expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );
        }
      });
    });

    describe('transferQuad with approval', function () {
      it('should transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {LandAsMinter, LandAsOther, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const landHolder = other;
          const landReceiver = other1;
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await LandAsMinter.mintQuad(landHolder, size, x, y, bytes);
          expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );
          const {to, data} = await LandAsMinter[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ].populateTransaction(landHolder, landReceiver, size, x, y, bytes);

          await LandAsOther.setApprovalForAll(landReceiver, true);

          await sendMetaTx(landHolder, to, data);

          expect(await LandAsMinter.balanceOf(landReceiver)).to.be.equal(
            plotCount,
          );
          expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(0);
        }
      });
    });

    describe('transferQuad from self', function () {
      it('should revert transfer of quad twice through parent quad', async function () {
        let size1;
        let size2;
        for (let i = 0; i < sizes.length; i++) {
          size1 = sizes[i];
          for (let j = 0; j < sizes.length; j++) {
            size2 = sizes[j];
            if (size2 < size1) {
              const {LandAsMinter, LandAsOther, other, other1, other2} =
                await loadFixture(setupPolygonLand);

              const landHolder = other;
              const landReceiver = other1;
              const landReceiver2 = other2;
              const x = 0;
              const y = 0;
              const bytes = '0x00';

              await LandAsMinter.mintQuad(landHolder, size1, x, y, bytes);
              expect(await LandAsMinter.ownerOf(0)).to.be.equal(landHolder);

              await LandAsOther.transferQuad(
                landHolder,
                landReceiver,
                size2,
                x,
                y,
                bytes,
              );

              await expect(
                LandAsOther.transferQuad(
                  landHolder,
                  landReceiver2,
                  size2,
                  x,
                  y,
                  bytes,
                ),
              ).to.be.revertedWith(/not owner/);
            }
          }
        }
      });

      it('should transfer quads of any size', async function () {
        for (let i = 0; i < sizes.length; i++) {
          const {LandAsMinter, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const landHolder = other;
          const landReceiver = other1;
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';
          const plotCount = size * size;

          // Mint LAND on L1
          await LandAsMinter.mintQuad(landHolder, size, x, y, bytes);
          expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(
            plotCount,
          );

          const {to, data} = await LandAsMinter[
            'transferQuad(address,address,uint256,uint256,uint256,bytes)'
          ].populateTransaction(landHolder, landReceiver, size, x, y, bytes);

          await sendMetaTx(landHolder, to, data);

          expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(0);
          expect(await LandAsMinter.balanceOf(landReceiver)).to.be.equal(
            plotCount,
          );
        }
      });
    });

    describe('Burn and transfer full quad', function () {
      it('should revert transfer of 1x1 quad after burn', async function () {
        const {LandAsMinter, LandAsOther, other, other1, sendMetaTx} =
          await loadFixture(setupPolygonLand);

        const landHolder = other;
        const landReceiver = other1;
        const size = 1;
        const x = 0;
        const y = 0;
        const bytes = '0x00';

        await LandAsMinter.mintQuad(landHolder, size, x, y, bytes);
        const id = x + y * 408;
        const {to, data} =
          await LandAsMinter['burn(uint256)'].populateTransaction(id);

        await sendMetaTx(landHolder, to, data);

        await expect(
          LandAsOther.transferQuad(landHolder, landReceiver, size, x, y, bytes),
        ).to.be.revertedWith('token does not exist');
      });

      it('should revert transfer of quad if a sub quad is burned', async function () {
        let size1;
        let size2;
        for (let i = 0; i < sizes.length; i++) {
          size1 = sizes[i];
          for (let j = 0; j < sizes.length; j++) {
            size2 = sizes[j];
            if (size2 >= size1) continue;
            const {LandAsMinter, LandAsOther, other, other1, sendMetaTx} =
              await loadFixture(setupPolygonLand);

            const landHolder = other;
            const landReceiver = other1;
            const x = 0;
            const y = 0;
            const bytes = '0x00';
            const plotCount = size1 * size1;

            // Mint LAND on L1
            await LandAsMinter.mintQuad(landHolder, size1, x, y, bytes);
            expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(
              plotCount,
            );
            expect(await LandAsOther.ownerOf(0)).to.be.equal(landHolder);

            for (let x = 0; x < size2; x++) {
              for (let y = 0; y < size2; y++) {
                const id = x + y * GRID_SIZE;
                const {to, data} =
                  await LandAsOther['burn(uint256)'].populateTransaction(id);

                await sendMetaTx(landHolder, to, data);
              }
            }

            await expect(LandAsOther.ownerOf(0))
              .to.be.revertedWithCustomError(
                LandAsOther,
                'ERC721NonexistentToken',
              )
              .withArgs(0);

            await expect(
              LandAsOther.transferQuad(
                landHolder,
                landReceiver,
                size1,
                x,
                y,
                bytes,
              ),
            ).to.be.revertedWith('not owner');

            //check override
            await expect(LandAsOther.ownerOf(0))
              .to.be.revertedWithCustomError(
                LandAsOther,
                'ERC721NonexistentToken',
              )
              .withArgs(0);
          }
        }
      });

      it('should revert transfer of any size quad after burn', async function () {
        for (let i = 1; i < sizes.length; i++) {
          const {LandAsMinter, LandAsOther, other, other1, sendMetaTx} =
            await loadFixture(setupPolygonLand);

          const landHolder = other;
          const landReceiver = other1;
          const size = sizes[i];
          const x = 0;
          const y = 0;
          const bytes = '0x00';

          await LandAsMinter.mintQuad(landHolder, size, x, y, bytes);
          for (let x = 0; x < size; x++) {
            for (let y = 0; y < size; y++) {
              const id = x + y * 408;
              const {to, data} =
                await LandAsOther['burn(uint256)'].populateTransaction(id);

              await sendMetaTx(landHolder, to, data);
            }
          }

          await expect(
            LandAsOther.transferQuad(
              landHolder,
              landReceiver,
              size,
              x,
              y,
              bytes,
            ),
          ).to.be.revertedWith('not owner');
        }
      });
    });

    describe('batchTransferQuad', function () {
      it('should batch transfer 1x1 quads', async function () {
        const {LandAsMinter, LandAsOther, other, other1, sendMetaTx} =
          await loadFixture(setupPolygonLand);

        const landHolder = other;
        const landReceiver = other1;
        const size = 1;
        const bytes = '0x00';

        // Mint LAND on L1
        await LandAsMinter.mintQuad(landHolder, size, 0, 0, bytes);
        await LandAsMinter.mintQuad(landHolder, size, 0, 1, bytes);

        expect(await LandAsOther.balanceOf(landHolder)).to.be.equal(2);

        const {to, data} = await LandAsOther[
          'batchTransferQuad(address,address,uint256[],uint256[],uint256[],bytes)'
        ].populateTransaction(
          landHolder,
          landReceiver,
          [size, size],
          [0, 0],
          [0, 1],
          bytes,
        );
        await sendMetaTx(landHolder, to, data);
        expect(await LandAsOther.balanceOf(landHolder)).to.be.equal(0);
        expect(await LandAsOther.balanceOf(landReceiver)).to.be.equal(2);
      });

      it('should batch transfer quads of different sizes', async function () {
        const {LandAsMinter, LandAsOther, other, other1, sendMetaTx} =
          await loadFixture(setupPolygonLand);
        const bytes = '0x3333';
        const landHolder = other;
        const landReceiver = other1;

        await LandAsMinter.mintQuad(landHolder, 12, 144, 144, bytes);
        await LandAsMinter.mintQuad(landHolder, 6, 36, 36, bytes);
        await LandAsMinter.mintQuad(landHolder, 3, 9, 9, bytes);
        await LandAsMinter.mintQuad(landHolder, 1, 0, 0, bytes);

        expect(await LandAsMinter.balanceOf(landHolder)).to.be.equal(190);

        const {to, data} = await LandAsOther[
          'batchTransferQuad(address,address,uint256[],uint256[],uint256[],bytes)'
        ].populateTransaction(
          landHolder,
          landReceiver,
          [12, 6, 3, 1],
          [144, 36, 9, 0],
          [144, 36, 9, 0],
          bytes,
        );

        await sendMetaTx(landHolder, to, data);

        expect(await LandAsOther.balanceOf(landHolder)).to.be.equal(0);
        expect(await LandAsOther.balanceOf(landReceiver)).to.be.equal(190);
      });
    });
  });
});
