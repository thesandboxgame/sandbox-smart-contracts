import {ethers} from 'hardhat';
import {runEstateSaleSetup} from './estate-sale-test-setup';
import {expect} from './utils/chai-setup';

describe('EstateSaleWithAuth (/packages/land-sale/contracts/EstateSaleWithAuth.sol)', function () {
  it('should deploy the EstateSaleWithAuth contract', async function () {
    const {deployEstateSaleContract} = await runEstateSaleSetup();
    await expect(deployEstateSaleContract()).to.not.be.reverted;
  });
  describe('Functions', function () {
    describe('setReceivingWallet', function () {
      it('should allow admin to set new receving wallet', async function () {
        const {EstateSaleContractAsAdmin, newLandSaleBeneficiary} =
          await runEstateSaleSetup();

        const tx = EstateSaleContractAsAdmin.setReceivingWallet(
          newLandSaleBeneficiary.address,
        );

        await expect(tx).to.not.be.reverted;
        await expect(tx)
          .to.emit(EstateSaleContractAsAdmin, 'NewReceivingWallet')
          .withArgs(newLandSaleBeneficiary.address);
      });
      it('should not allow non-admin to set new receving wallet', async function () {
        const {EstateSaleContract, newLandSaleBeneficiary} =
          await runEstateSaleSetup();

        const tx = EstateSaleContract.setReceivingWallet(
          newLandSaleBeneficiary.address,
        );

        await expect(tx).to.be.revertedWith('NOT_AUTHORIZED');
      });
      it('should not allow admin to set new receving wallet to the zero address', async function () {
        const {EstateSaleContractAsAdmin} = await runEstateSaleSetup();

        const tx = EstateSaleContractAsAdmin.setReceivingWallet(
          ethers.ZeroAddress,
        );
        await expect(tx).to.be.revertedWith('ZERO_ADDRESS');
      });
    });
    describe('buyLandWithSand', function () {
      describe('Reverts', function () {
        it('should revert if the sale is over', async function () {
          const {deployEstateSaleContract, buyLand} =
            await runEstateSaleSetup();
          const EstateSaleContract = await deployEstateSaleContract({
            expiryTime: 0,
          });
          await expect(
            buyLand({
              estateSaleContract: EstateSaleContract,
            }),
          ).to.be.revertedWith('SALE_IS_OVER');
        });
        it('should revert if the buyer is not the sender', async function () {
          const {buyLand, landBuyer2, landBuyer} = await runEstateSaleSetup();
          await expect(
            buyLand({
              from: landBuyer2,
              buyer: landBuyer,
            }),
          ).to.be.revertedWith('NOT_AUTHORIZED');
        });
        it('should revert if trying to buy a reserved land', async function () {
          const {buyLand, landBuyer, reservedLandIndex} =
            await runEstateSaleSetup();
          await expect(
            buyLand({
              buyer: landBuyer,
              landIndex: reservedLandIndex,
            }),
          ).to.be.revertedWith('RESERVED_LAND');
        });
        it('should revert if the signature is invalid', async function () {
          const {buyLand} = await runEstateSaleSetup();
          await expect(
            buyLand({
              useWrongSalt: true,
            }),
          ).to.be.revertedWith('INVALID_AUTH');
        });
        it('should revert if trying to purchase another land that the one from the proof', async function () {
          const {buyLand} = await runEstateSaleSetup();
          await expect(
            buyLand({
              useWrongProof: true,
            }),
          ).to.be.revertedWith('INVALID_LAND');
        });
        it("shoudl revert if the buyer doesn't have enough funds", async function () {
          const {buyLand, landBuyer} = await runEstateSaleSetup();
          await expect(
            buyLand({buyer: landBuyer, landIndex: 3}),
          ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
        });
      });
      describe('Success', function () {
        it('should send the 5% land fee to the specified address', async function () {
          const {
            buyLand,
            landSaleFeeRecipient,
            SandContract,
            singleLandSandPrice,
          } = await runEstateSaleSetup();

          await buyLand();

          const fivePercentFee = (singleLandSandPrice * 5n) / 100n;
          const balance = await SandContract.balanceOf(
            landSaleFeeRecipient.address,
          );

          expect(balance).to.equal(fivePercentFee);
        });
        it('should NOT revert if the buyer is not the sender and IT IS a meta transaction', async function () {
          const {buyLand, trustedForwarder, landBuyer} =
            await runEstateSaleSetup();
          await expect(
            buyLand({
              from: trustedForwarder,
              buyer: landBuyer,
            }),
          ).to.not.be.reverted;
        });
        it('should NOT revert if trying to buy a reserved land from correct account', async function () {
          const {buyLand, landBuyer2} = await runEstateSaleSetup();
          await expect(
            buyLand({
              from: landBuyer2,
              buyer: landBuyer2,
            }),
          ).to.not.be.reverted;
        });
        it("should mint new land to the to's address", async function () {
          const {buyLand} = await runEstateSaleSetup();
          await expect(buyLand()).to.not.be.reverted;
        });
        it("should send assets to the to's address for premium lands", async function () {
          const {
            buyLand,
            proofInfo,
            mintSand,
            premiumLandSandPrice,
            landBuyer,
            AssetContract,
          } = await runEstateSaleSetup();
          const landIndex = 3;
          const {assetIds} = proofInfo[landIndex];
          await mintSand(landBuyer, premiumLandSandPrice);
          await buyLand({landIndex});
          const balance = await AssetContract.balanceOfBatch(
            [landBuyer.address],
            assetIds,
          );
          expect(balance[0]).to.equal(1);
        });
      });
      describe('Events', function () {
        it("should emit NewReceivingWallet with the new wallet's address", async function () {
          const {EstateSaleContractAsAdmin, newLandSaleBeneficiary} =
            await runEstateSaleSetup();
          const tx = EstateSaleContractAsAdmin.setReceivingWallet(
            newLandSaleBeneficiary.address,
          );
          await expect(tx)
            .to.emit(EstateSaleContractAsAdmin, 'NewReceivingWallet')
            .withArgs(newLandSaleBeneficiary.address);
        });
        it('should emit LandQuadPurchased with the buyers and land info', async function () {
          const {
            buyLand,
            landBuyer,
            EstateSaleContract,
            proofInfo,
            SandContract,
          } = await runEstateSaleSetup();
          const landIndex = 0;
          const {x, y, size, price} = proofInfo[landIndex];
          const tx = buyLand({
            from: landBuyer,
            buyer: landBuyer,
            landIndex,
          });
          const sandAddress = await SandContract.getAddress();

          await expect(tx)
            .to.emit(EstateSaleContract, 'LandQuadPurchased')
            .withArgs(
              landBuyer.address,
              landBuyer.address,
              x + y * 408,
              size,
              price,
              sandAddress,
              price,
            );
        });
      });
    });
  });
});
