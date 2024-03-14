import {ethers} from 'hardhat';
import {runEstateSaleSetup} from './estateSaleTestSetup';
import {expect} from './utils/chai-setup';

describe.only('EstateSaleWithAuth (/packages/land-sale/contracts/EstateSaleWithAuth.sol)', function () {
  it('should deploy the EstateSaleWithAuth contract', async function () {
    const {PolygonLandContract} = await runEstateSaleSetup();
    console.log(PolygonLandContract);
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
      it('should revert if the sale is over', async function () {});
      it('should revert if the buyer is not the sender', async function () {});
      it('should revert if the buyer is not the sender and its not a meta transaction', async function () {});
      it('should revert if trying to buy a reserved land', async function () {});
      it('should revert if the signature is invalid', async function () {});
      it('should revert if merkle proof is invalid', async function () {});
      it('should send the 5% land fee to the specified address', async function () {});
      it("should mint new land to the to's address", async function () {
        const {buyLand} = await runEstateSaleSetup();
        await buyLand();
      });
      it("should send assets to the to's address", async function () {});
    });
  });
});
