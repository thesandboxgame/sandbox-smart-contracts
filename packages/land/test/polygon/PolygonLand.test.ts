import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupPolygonLand, setupPolygonLandMock} from './fixtures';
import {gasAndSizeChecks} from '../common/gasAndSizeChecks.behavior';
import {getId, getStorageSlotJS} from '../fixtures';
import {keccak256, Wallet} from 'ethers';

const sizes = [1, 3, 6, 12, 24];
const GRID_SIZE = 408;

// TODO: some test were testing the tunnel => not anymore. We need to check if we missed something.
describe('PolygonLand.sol', function () {
  // eslint-disable-next-line mocha/no-setup-in-describe
  gasAndSizeChecks(setupPolygonLand, 'PolygonLand');

  it('should not set trustedForwarder if caller is not admin', async function () {
    const {LandAsOther, TrustedForwarderContract} =
      await loadFixture(setupPolygonLand);
    await expect(
      LandAsOther.setTrustedForwarder(TrustedForwarderContract),
    ).to.be.revertedWithCustomError(LandAsOther, 'OnlyAdmin');
  });

  it('should return the trusted forwarder', async function () {
    const {LandContract, TrustedForwarderContract} =
      await loadFixture(setupPolygonLand);
    expect(await LandContract.getTrustedForwarder()).to.be.equal(
      TrustedForwarderContract,
    );
  });

  it('should verify trusted forwarder', async function () {
    const {LandContract, TrustedForwarderContract, other} =
      await loadFixture(setupPolygonLand);
    expect(
      await LandContract.isTrustedForwarder(TrustedForwarderContract),
    ).to.be.equal(true);
    expect(await LandContract.isTrustedForwarder(other)).to.be.equal(false);
  });

  it('changes the admin to a new address via meta transaction', async function () {
    const {LandAsAdmin, landAdmin, deployer, sendMetaTx} =
      await loadFixture(setupPolygonLand);
    const {to, data} =
      await LandAsAdmin.changeAdmin.populateTransaction(deployer);
    await sendMetaTx(landAdmin, to, data);
    expect(await LandAsAdmin.getAdmin()).to.be.equal(deployer);
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
    expect(slots._operatorFilterRegistry).to.be.equal(108);
  });

  it('check V5 storage structure', async function () {
    const {landContract} = await loadFixture(setupPolygonLandMock);

    const slots = await landContract.getV5VarsStorageStructure();
    expect(slots.owner).to.be.equal(
      getStorageSlotJS('thesandbox.storage.land.common.WithOwner'),
    );
    expect(slots.landMetadataRegistry).to.be.equal(
      getStorageSlotJS('thesandbox.storage.land.common.WithMetadataRegistry'),
    );
    expect(slots.royaltiesStorage).to.be.equal(
      getStorageSlotJS('thesandbox.storage.land.common.WithRoyalties'),
    );
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

          await expect(sendMetaTx(landReceiver, to, data))
            .to.revertedWithCustomError(LandAsMinter, 'ERC721InvalidOwner')
            .withArgs(landReceiver);
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
              )
                .to.be.revertedWithCustomError(
                  LandAsOther,
                  'ERC721InvalidOwner',
                )
                .withArgs(other);
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
        )
          .to.be.revertedWithCustomError(LandAsOther, 'NotOwner')
          .withArgs(x, y);
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
            )
              .to.be.revertedWithCustomError(LandAsOther, 'NotOwner')
              .withArgs(x, y);

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
          )
            .to.be.revertedWithCustomError(LandAsOther, 'NotOwner')
            .withArgs(x, y);
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

  it('write mixins to get 100% coverage on them', async function () {
    const {LandAsAdmin, LandAsMinter, other} =
      await loadFixture(setupPolygonLand);

    const admin = Wallet.createRandom();
    const superOperator = Wallet.createRandom();
    const owner = Wallet.createRandom();
    const quantity = keccak256(await Wallet.createRandom().getAddress());
    await LandAsMinter.mintQuad(other, 1, 407, 407, '0x');
    const tokenId = getId(1, 407, 407);
    // owner + operator flag
    const ownerData = BigInt(await owner.getAddress()) | (2n ** 255n);
    const operator = Wallet.createRandom();
    const minter = Wallet.createRandom();
    const registry = Wallet.createRandom();
    await LandAsAdmin.writeMixingForCoverage(
      admin,
      superOperator,
      owner,
      quantity,
      tokenId,
      ownerData,
      operator,
      minter,
      registry,
    );
    expect(await LandAsAdmin.getAdmin()).to.be.equal(admin);
    expect(await LandAsAdmin.isSuperOperator(superOperator)).to.be.true;
    expect(await LandAsAdmin.balanceOf(owner)).to.be.equal(quantity);
    expect(await LandAsAdmin.getOwnerData(tokenId)).to.be.equal(ownerData);
    expect(await LandAsAdmin.isApprovedForAll(owner, operator)).to.be.true;
    expect(await LandAsAdmin.getApproved(tokenId)).to.be.equal(operator);
    expect(await LandAsAdmin.isMinter(minter)).to.be.true;
    expect(await LandAsAdmin.operatorFilterRegistry()).to.be.equal(registry);
  });
});
