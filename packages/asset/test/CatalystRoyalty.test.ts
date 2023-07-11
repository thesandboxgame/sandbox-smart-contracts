import {ethers} from 'hardhat';
import {expect} from 'chai';
import {BigNumber} from 'ethers';
import {catalystRoyaltyDistribution} from './fixtures/catalystRoyaltyFixture';
describe('Catalyst royalty', function () {
  it('manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)', async function () {
    const {managerAsRoyaltySetter, catalyst} =
      await catalystRoyaltyDistribution();
    expect(
      await managerAsRoyaltySetter.contractRoyalty(catalyst.address)
    ).to.be.equal(0);
    await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
    expect(
      await managerAsRoyaltySetter.contractRoyalty(catalyst.address)
    ).to.be.equal(500);
  });

  it('only manager contract royalty setter can set Eip 2981 royaltyBps for other contracts (catalyst)', async function () {
    const {manager, seller, catalyst, contractRoyaltySetterRole} =
      await catalystRoyaltyDistribution();
    await expect(
      manager
        .connect(await ethers.provider.getSigner(seller))
        .setContractRoyalty(catalyst.address, 500)
    ).to.be.revertedWith(
      `AccessControl: account ${seller.toLocaleLowerCase()} is missing role ${contractRoyaltySetterRole}`
    );
  });
  it('catalyst should return EIP2981 royalty recipient and royalty for other contracts(catalyst)', async function () {
    const {commonRoyaltyReceiver, catalyst, managerAsRoyaltySetter} =
      await catalystRoyaltyDistribution();
    await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
    const id = 1;
    const priceToken = 300000;
    const royaltyInfo = await catalyst.royaltyInfo(id, priceToken);
    expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver);
    expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);
  });

  it('catalyst should same return EIP2981 royalty recipient for different tokens contracts(catalyst)', async function () {
    const {commonRoyaltyReceiver, catalyst, managerAsRoyaltySetter} =
      await catalystRoyaltyDistribution();
    await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
    const id = 1;
    const id2 = 2;
    const priceToken = 300000;
    const royaltyInfo = await catalyst.royaltyInfo(id, priceToken);
    expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver);
    expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);

    const royaltyInfo2 = await catalyst.royaltyInfo(id2, priceToken);
    expect(royaltyInfo2[0]).to.be.equals(commonRoyaltyReceiver);
    expect(royaltyInfo2[1]).to.be.equals((500 * priceToken) / 10000);
  });

  it('should split ERC20 using EIP2981', async function () {
    const {
      catalyst,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      managerAsRoyaltySetter,
    } = await catalystRoyaltyDistribution();
    await catalyst.mint(seller, 1, 1);

    await ERC20.mint(buyer, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await catalyst
      .connect(await ethers.provider.getSigner(seller))
      .setApprovalForAll(mockMarketplace.address, true);
    expect(await catalyst.balanceOf(seller, 1)).to.be.equals(1);
    expect(await ERC20.balanceOf(commonRoyaltyReceiver)).to.be.equals(0);

    await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);

    await mockMarketplace.distributeRoyaltyEIP2981(
      1000000,
      ERC20.address,
      catalyst.address,
      1,
      buyer,
      seller,
      true
    );

    expect(await ERC20.balanceOf(commonRoyaltyReceiver)).to.be.equals(
      (1000000 / 10000) * 500
    );
  });

  it('should split ETH using EIP2981', async function () {
    const {
      catalyst,
      ERC20,
      mockMarketplace,
      ERC20AsBuyer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      managerAsRoyaltySetter,
      user,
    } = await catalystRoyaltyDistribution();
    await catalyst.mint(seller, 1, 1);

    await ERC20.mint(buyer, 1000000);
    await ERC20AsBuyer.approve(mockMarketplace.address, 1000000);
    await catalyst
      .connect(await ethers.provider.getSigner(seller))
      .setApprovalForAll(mockMarketplace.address, true);
    expect(await catalyst.balanceOf(seller, 1)).to.be.equals(1);
    const value = ethers.utils.parseUnits('1000', 'ether');

    await managerAsRoyaltySetter.setContractRoyalty(catalyst.address, 500);
    const balanceCommonRoyaltyReceiver = await ethers.provider.getBalance(
      commonRoyaltyReceiver
    );

    await mockMarketplace
      .connect(await ethers.getSigner(user))
      .distributeRoyaltyEIP2981(
        0,
        ERC20.address,
        catalyst.address,
        1,
        buyer,
        seller,
        true,
        {
          value: value,
        }
      );

    const balanceCommonRoyaltyReceiverNew = await ethers.provider.getBalance(
      commonRoyaltyReceiver
    );

    expect(
      balanceCommonRoyaltyReceiverNew.sub(balanceCommonRoyaltyReceiver)
    ).to.be.equal(value.mul(BigNumber.from(500)).div(BigNumber.from(10000)));
  });
});
