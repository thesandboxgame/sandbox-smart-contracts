import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';

// eslint-disable-next-line mocha/no-exports
export function shouldCheckForRoyalty(setupLand, Contract: string) {
  describe(Contract + ':Royalty', function () {
    it('land should return EIP2981 royalty recipient and royalty for other contracts', async function () {
      const {RoyaltyManagerContract, LandContract, commonRoyaltyReceiver} =
        await loadFixture(setupLand);
      await RoyaltyManagerContract.setContractRoyalty(
        await LandContract.getAddress(),
        500,
      );
      const id = 1;
      const priceToken = 300000;
      const royaltyInfo = await LandContract.royaltyInfo(id, priceToken);
      expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver);
      expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);
    });

    it('land should return same EIP2981 royalty recipient for different tokens contracts', async function () {
      const {RoyaltyManagerContract, LandContract, commonRoyaltyReceiver} =
        await loadFixture(setupLand);
      await RoyaltyManagerContract.setContractRoyalty(
        await LandContract.getAddress(),
        500,
      );
      const id = 1;
      const id2 = 2;
      const priceToken = 300000;
      const royaltyInfo = await LandContract.royaltyInfo(id, priceToken);
      expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver.address);
      expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);

      const royaltyInfo2 = await LandContract.royaltyInfo(id2, priceToken);
      expect(royaltyInfo2[0]).to.be.equals(commonRoyaltyReceiver.address);
      expect(royaltyInfo2[1]).to.be.equals((500 * priceToken) / 10000);
    });

    it('should split ERC20 using EIP2981', async function () {
      const {
        LandAsMinter,
        ERC20Contract,
        ERC20AsBuyer,
        MockMarketPlace,
        LandContract,
        seller,
        buyer,
        RoyaltyManagerContract,
        commonRoyaltyReceiver,
      } = await loadFixture(setupLand);
      await LandAsMinter.mintQuad(await seller.getAddress(), 1, 0, 0, '0x');

      await ERC20Contract.mint(buyer, 1000000);
      await ERC20AsBuyer.approve(MockMarketPlace, 1000000);
      await LandContract.connect(seller).setApprovalForAll(
        MockMarketPlace,
        true,
      );

      expect(await LandContract.balanceOf(seller)).to.be.equals(1);
      expect(await LandContract.balanceOf(buyer)).to.be.equals(0);
      expect(await ERC20Contract.balanceOf(buyer)).to.be.equals(1000000);
      expect(await ERC20Contract.balanceOf(commonRoyaltyReceiver)).to.be.equals(
        0,
      );

      await RoyaltyManagerContract.setContractRoyalty(LandContract, 500);

      await MockMarketPlace.distributeRoyaltyEIP2981(
        1000000,
        ERC20Contract,
        LandContract,
        0,
        buyer,
        seller,
      );

      expect(await ERC20Contract.balanceOf(commonRoyaltyReceiver)).to.be.equals(
        (1000000 / 10000) * 500,
      );
      expect(await ERC20Contract.balanceOf(buyer)).to.be.equals(0);
      expect(await ERC20Contract.balanceOf(seller)).to.be.equals(950000); //1000000 - royalty
      expect(await LandContract.balanceOf(seller)).to.be.equals(0);
      expect(await LandContract.balanceOf(buyer)).to.be.equals(1);
    });
  });
}
