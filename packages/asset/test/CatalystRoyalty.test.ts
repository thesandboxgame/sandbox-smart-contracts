import {ethers} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {catalystRoyaltyDistribution} from './fixtures/catalyst/catalystRoyaltyFixture';
describe('catalyst royalty', function () {
  it('manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)', async function () {
    const {managerAsRoyaltySetter, catalystAsMinter} =
      await catalystRoyaltyDistribution();
    expect(
      await managerAsRoyaltySetter.contractRoyalty(catalystAsMinter.address)
    ).to.be.equal(0);
    await managerAsRoyaltySetter.setContractRoyalty(
      catalystAsMinter.address,
      500
    );
    expect(
      await managerAsRoyaltySetter.contractRoyalty(catalystAsMinter.address)
    ).to.be.equal(500);
  });

  it('only manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)', async function () {
    const {manager, seller, catalystAsMinter, contractRoyaltySetterRole} =
      await catalystRoyaltyDistribution();
    await expect(
      manager.connect(seller).setContractRoyalty(catalystAsMinter.address, 500)
    ).to.be.revertedWith(
      `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${contractRoyaltySetterRole}`
    );
  });

  it('catalyst should return EIP2981 royalty recipient and royalty for other contracts(catalyst)', async function () {
    const {commonRoyaltyReceiver, catalystAsMinter, managerAsRoyaltySetter} =
      await catalystRoyaltyDistribution();
    await managerAsRoyaltySetter.setContractRoyalty(
      catalystAsMinter.address,
      500
    );
    const id = 1;
    const priceToken = 300000;
    const royaltyInfo = await catalystAsMinter.royaltyInfo(id, priceToken);
    expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver.address);
    expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);
  });

  it('catalyst should same return EIP2981 royalty recipient for different tokens contracts(catalyst)', async function () {
    const {commonRoyaltyReceiver, catalystAsMinter, managerAsRoyaltySetter} =
      await catalystRoyaltyDistribution();
    await managerAsRoyaltySetter.setContractRoyalty(
      catalystAsMinter.address,
      500
    );
    const id = 1;
    const id2 = 2;
    const priceToken = 300000;
    const royaltyInfo = await catalystAsMinter.royaltyInfo(id, priceToken);
    expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver.address);
    expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);

    const royaltyInfo2 = await catalystAsMinter.royaltyInfo(id2, priceToken);
    expect(royaltyInfo2[0]).to.be.equals(commonRoyaltyReceiver.address);
    expect(royaltyInfo2[1]).to.be.equals((500 * priceToken) / 10000);
  });

  it('should split ERC20 using EIP2981', async function () {
    const {
      catalystAsMinter,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      managerAsRoyaltySetter,
    } = await catalystRoyaltyDistribution();
    await catalystAsMinter.mint(seller.address, 1, 1);

    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await catalystAsMinter
      .connect(seller)
      .setApprovalForAll(mockMarketplace.address, true);
    expect(await catalystAsMinter.balanceOf(seller.address, 1)).to.be.equals(1);
    expect(await ERC20.balanceOf(commonRoyaltyReceiver.address)).to.be.equals(
      0
    );

    await managerAsRoyaltySetter.setContractRoyalty(
      catalystAsMinter.address,
      500
    );

    await mockMarketplace.distributeRoyaltyEIP2981(
      1000000,
      ERC20.address,
      catalystAsMinter.address,
      1,
      buyer.address,
      seller.address,
      true
    );

    expect(await ERC20.balanceOf(commonRoyaltyReceiver.address)).to.be.equals(
      (1000000 / 10000) * 500
    );
  });

  it('should split ETH using EIP2981', async function () {
    const {
      catalystAsMinter,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      managerAsRoyaltySetter,
      user,
    } = await catalystRoyaltyDistribution();
    await catalystAsMinter.mint(seller.address, 1, 1);

    await ERC20.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await catalystAsMinter
      .connect(seller)
      .setApprovalForAll(mockMarketplace.address, true);
    expect(await catalystAsMinter.balanceOf(seller.address, 1)).to.be.equals(1);
    const value = ethers.utils.parseUnits('1000', 'ether');

    await managerAsRoyaltySetter.setContractRoyalty(
      catalystAsMinter.address,
      500
    );
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );

    await mockMarketplace
      .connect(user)
      .distributeRoyaltyEIP2981(
        0,
        ERC20.address,
        catalystAsMinter.address,
        1,
        buyer.address,
        seller.address,
        true,
        {
          value: value,
        }
      );

    const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
      commonRoyaltyReceiver.address
    );

    expect(
      balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
    ).to.be.equal(value.mul(BigNumber.from(500)).div(BigNumber.from(10000)));
  });
});
