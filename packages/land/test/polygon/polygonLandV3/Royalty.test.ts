import {expect} from 'chai';
import {setupPolygonLandV3} from './fixtures';

describe('PolygonLandV3 Royalty', function () {
  it('manager contract royalty setter can set Eip 2981 royaltyBps for other contracts', async function () {
    const {managerAsRoyaltySetter, PolygonLandV3Contract} =
      await setupPolygonLandV3();
    expect(
      await managerAsRoyaltySetter.contractRoyalty(
        await PolygonLandV3Contract.getAddress(),
      ),
    ).to.be.equal(0);
    await managerAsRoyaltySetter.setContractRoyalty(
      await PolygonLandV3Contract.getAddress(),
      500,
    );
    expect(
      await managerAsRoyaltySetter.contractRoyalty(
        await PolygonLandV3Contract.getAddress(),
      ),
    ).to.be.equal(500);
  });

  it('only manager contract royalty setter can set Eip 2981 royaltyBps for other contracts', async function () {
    const {manager, seller, PolygonLandV3Contract, contractRoyaltySetterRole} =
      await setupPolygonLandV3();
    await expect(
      manager
        .connect(seller)
        .setContractRoyalty(await PolygonLandV3Contract.getAddress(), 500),
    ).to.be.revertedWith(
      `AccessControl: account ${seller.address.toLocaleLowerCase()} is missing role ${contractRoyaltySetterRole}`,
    );
  });

  it('land should return EIP2981 royalty recipient and royalty for other contracts', async function () {
    const {
      commonRoyaltyReceiver,
      PolygonLandV3Contract,
      managerAsRoyaltySetter,
    } = await setupPolygonLandV3();
    await managerAsRoyaltySetter.setContractRoyalty(
      await PolygonLandV3Contract.getAddress(),
      500,
    );
    const id = 1;
    const priceToken = 300000;
    const royaltyInfo = await PolygonLandV3Contract.royaltyInfo(id, priceToken);
    expect(royaltyInfo[0]).to.be.equals(
      await commonRoyaltyReceiver.getAddress(),
    );
    expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);
  });

  it('land should return same EIP2981 royalty recipient for different tokens contracts', async function () {
    const {
      commonRoyaltyReceiver,
      PolygonLandV3Contract,
      managerAsRoyaltySetter,
    } = await setupPolygonLandV3();
    await managerAsRoyaltySetter.setContractRoyalty(
      await PolygonLandV3Contract.getAddress(),
      500,
    );
    const id = 1;
    const id2 = 2;
    const priceToken = 300000;
    const royaltyInfo = await PolygonLandV3Contract.royaltyInfo(id, priceToken);
    expect(royaltyInfo[0]).to.be.equals(commonRoyaltyReceiver.address);
    expect(royaltyInfo[1]).to.be.equals((500 * priceToken) / 10000);

    const royaltyInfo2 = await PolygonLandV3Contract.royaltyInfo(
      id2,
      priceToken,
    );
    expect(royaltyInfo2[0]).to.be.equals(commonRoyaltyReceiver.address);
    expect(royaltyInfo2[1]).to.be.equals((500 * priceToken) / 10000);
  });

  it('should split ERC20 using EIP2981', async function () {
    const {
      PolygonLandV3Contract,
      LandAsMinter,
      ERC20Contract,
      MockMarketPlace,
      ERC20AsBuyer,
      seller,
      buyer,
      commonRoyaltyReceiver,
      managerAsRoyaltySetter,
    } = await setupPolygonLandV3();

    await LandAsMinter.mintQuad(await seller.getAddress(), 1, 0, 0, '0x');

    await ERC20Contract.mint(buyer.address, 1000000);
    await ERC20AsBuyer.approve(await MockMarketPlace.getAddress(), 1000000);
    await PolygonLandV3Contract.connect(seller).setApprovalForAll(
      await MockMarketPlace.getAddress(),
      true,
    );

    expect(
      await PolygonLandV3Contract.balanceOf(await seller.getAddress()),
    ).to.be.equals(1);
    expect(
      await PolygonLandV3Contract.balanceOf(await buyer.getAddress()),
    ).to.be.equals(0);
    expect(await ERC20Contract.balanceOf(buyer.getAddress())).to.be.equals(
      1000000,
    );
    expect(
      await ERC20Contract.balanceOf(await commonRoyaltyReceiver.getAddress()),
    ).to.be.equals(0);

    await managerAsRoyaltySetter.setContractRoyalty(
      PolygonLandV3Contract.getAddress(),
      500,
    );

    await MockMarketPlace.distributeRoyaltyEIP2981(
      1000000,
      ERC20Contract.getAddress(),
      PolygonLandV3Contract.getAddress(),
      0,
      buyer.getAddress(),
      seller.getAddress(),
    );

    expect(
      await ERC20Contract.balanceOf(commonRoyaltyReceiver.getAddress()),
    ).to.be.equals((1000000 / 10000) * 500);
    expect(await ERC20Contract.balanceOf(buyer.getAddress())).to.be.equals(0);
    expect(await ERC20Contract.balanceOf(seller.getAddress())).to.be.equals(
      950000,
    ); //1000000 - royalty
    expect(
      await PolygonLandV3Contract.balanceOf(await seller.getAddress()),
    ).to.be.equals(0);
    expect(
      await PolygonLandV3Contract.balanceOf(await buyer.getAddress()),
    ).to.be.equals(1);
  });
});
