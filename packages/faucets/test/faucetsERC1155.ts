import {expect} from 'chai';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {setupFaucetERC1155} from './fixtures';
import {mine, time} from '@nomicfoundation/hardhat-network-helpers';

describe('FaucetsERC1155', function () {
  it('Should allow a user to claim ERC1155 tokens', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      fakeAssets,
      faucetLimit,
    } = await loadFixture(setupFaucetERC1155);

    const otherAccountAddress = await otherAccount.getAddress();
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    await faucetsERC1155
      .connect(otherAccount)
      .claim(mockAssetERC1155Address, fakeAssets[0].id, faucetLimit);
    const otherAccountBalance = await mockAssetERC1155.balanceOf(
      otherAccountAddress,
      fakeAssets[0].id
    );
    expect(otherAccountBalance).to.equal(faucetLimit);
  });

  it('Should not allow a user to claim more than the limit', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      faucetLimit,
      fakeAssets,
    } = await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();

    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .claim(mockAssetERC1155Address, fakeAssets[0].id, faucetLimit + 1)
    ).to.be.revertedWith('Faucets: AMOUNT_TOO_HIGH');
  });

  it('Should not allow a user to claim before the faucet period expires', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      faucetLimit,
      fakeAssets,
    } = await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();

    await faucetsERC1155
      .connect(otherAccount)
      .claim(mockAssetERC1155Address, fakeAssets[0].id, faucetLimit);
    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .claim(mockAssetERC1155Address, fakeAssets[0].id, faucetLimit)
    ).to.be.revertedWith('Faucets: CLAIM_PERIOD_NOT_PASSED');
  });

  it('Should allow a user to claim after the faucet period expires', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      faucetLimit,
      fakeAssets,
      faucetPeriod,
    } = await loadFixture(setupFaucetERC1155);
    const otherAccountAddress = await otherAccount.getAddress();
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();

    await faucetsERC1155
      .connect(otherAccount)
      .claim(mockAssetERC1155Address, fakeAssets[0].id, faucetLimit);

    await time.increase(faucetPeriod);
    await mine();

    await faucetsERC1155
      .connect(otherAccount)
      .claim(mockAssetERC1155Address, fakeAssets[0].id, faucetLimit);
    const otherAccountBalance = await mockAssetERC1155.balanceOf(
      otherAccountAddress,
      fakeAssets[0].id
    );
    expect(otherAccountBalance).to.equal(faucetLimit * 2);
  });

  it("Should not allow a user to claim if the faucet doesn't have enough tokens", async function () {
    const {otherAccount, mockAssetERC1155, faucetsERC1155, fakeAssets} =
      await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();

    const highAmount = fakeAssets[1].supply + 1;
    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .claim(mockAssetERC1155Address, fakeAssets[1].id, highAmount)
    ).to.be.revertedWith('Faucets: BALANCE_IS_NOT_ENOUGH');
  });

  it("Should correctly get the faucet's period", async function () {
    const {mockAssetERC1155, faucetsERC1155, faucetPeriod} = await loadFixture(
      setupFaucetERC1155
    );
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();

    const period = await faucetsERC1155.getPeriod(mockAssetERC1155Address);
    expect(period).to.equal(faucetPeriod);
  });

  it('Should allow the owner to set a new faucet period', async function () {
    const {owner, mockAssetERC1155, faucetsERC1155} = await loadFixture(
      setupFaucetERC1155
    );
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();

    const newPeriod = 7200;
    await faucetsERC1155
      .connect(owner)
      .setPeriod(mockAssetERC1155Address, newPeriod);

    const updatedPeriod = await faucetsERC1155.getPeriod(
      mockAssetERC1155Address
    );
    expect(updatedPeriod).to.equal(newPeriod);
  });

  it('Should not allow a non-owner to set a new faucet period', async function () {
    const {otherAccount, mockAssetERC1155, faucetsERC1155} = await loadFixture(
      setupFaucetERC1155
    );
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();

    const newPeriod = 7200;
    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .setPeriod(mockAssetERC1155Address, newPeriod)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("Should allow the owner to withdraw all the faucet's tokens", async function () {
    const {owner, mockAssetERC1155, faucetsERC1155, fakeAssets} =
      await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const faucetsERC1155Address = await faucetsERC1155.getAddress();
    const ownerAddress = await owner.getAddress();
    const erc1155TokenIds = [fakeAssets[0].id, fakeAssets[1].id];

    const faucetBalanceBefore = await mockAssetERC1155.balanceOf(
      faucetsERC1155Address,
      fakeAssets[0].id
    );
    expect(faucetBalanceBefore).to.be.gt(0);

    await faucetsERC1155
      .connect(owner)
      .withdraw(mockAssetERC1155Address, ownerAddress, erc1155TokenIds);

    const faucetBalanceAfter = await mockAssetERC1155.balanceOf(
      faucetsERC1155Address,
      fakeAssets[0].id
    );
    const ownerBalanceAfter = await mockAssetERC1155.balanceOf(
      ownerAddress,
      fakeAssets[0].id
    );

    expect(faucetBalanceAfter).to.equal(0);
    expect(ownerBalanceAfter).to.equal(faucetBalanceBefore);
  });

  it("Should not allow a non-owner to withdraw the faucet's tokens", async function () {
    const {otherAccount, mockAssetERC1155, faucetsERC1155, fakeAssets} =
      await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const otherAccountAddress = await otherAccount.getAddress();
    const erc1155TokenIds = [fakeAssets[0].id, fakeAssets[1].id];

    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .withdraw(mockAssetERC1155Address, otherAccountAddress, erc1155TokenIds)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('Should allow a user to batch claim multiple ERC1155 tokens from a single faucet', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      fakeAssets,
      faucetLimit,
    } = await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const otherAccountAddress = await otherAccount.getAddress();
    const erc1155TokenIds = [fakeAssets[0].id, fakeAssets[1].id];

    const claimAmounts = [faucetLimit, fakeAssets[1].supply - 1];

    await faucetsERC1155
      .connect(otherAccount)
      .claimBatch(mockAssetERC1155Address, erc1155TokenIds, claimAmounts);

    const balanceTokenA = await mockAssetERC1155.balanceOf(
      otherAccountAddress,
      erc1155TokenIds[0]
    );
    const balanceTokenB = await mockAssetERC1155.balanceOf(
      otherAccountAddress,
      erc1155TokenIds[1]
    );

    expect(balanceTokenA).to.equal(claimAmounts[0]);
    expect(balanceTokenB).to.equal(claimAmounts[1]);
  });

  it('Should not allow a user to batch claim amounts greater than the set limits', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      fakeAssets,
      faucetLimit,
    } = await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const erc1155TokenIds = [fakeAssets[0].id, fakeAssets[1].id];
    const excessiveAmounts = [faucetLimit + 1, fakeAssets[1].supply + 1];

    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .claimBatch(mockAssetERC1155Address, erc1155TokenIds, excessiveAmounts)
    ).to.be.revertedWith('Faucets: AMOUNT_TOO_HIGH');
  });

  it('Should not allow a user to batch claim before the faucet period expires', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      fakeAssets,
      faucetLimit,
    } = await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const erc1155TokenIds = [fakeAssets[0].id, fakeAssets[1].id];

    await faucetsERC1155
      .connect(otherAccount)
      .claimBatch(mockAssetERC1155Address, erc1155TokenIds, [faucetLimit, 10]);

    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .claimBatch(mockAssetERC1155Address, erc1155TokenIds, [faucetLimit, 10])
    ).to.be.revertedWith('Faucets: CLAIM_PERIOD_NOT_PASSED');
  });

  it('Should allow a user to batch claim after the faucet period expires', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      fakeAssets,
      faucetLimit,
      faucetPeriod,
    } = await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const otherAccountAddress = await otherAccount.getAddress();
    const erc1155TokenIds = [fakeAssets[0].id, fakeAssets[1].id];

    await faucetsERC1155
      .connect(otherAccount)
      .claimBatch(mockAssetERC1155Address, erc1155TokenIds, [faucetLimit, 10]);

    await time.increase(faucetPeriod);
    await mine();

    await faucetsERC1155
      .connect(otherAccount)
      .claimBatch(mockAssetERC1155Address, erc1155TokenIds, [faucetLimit, 10]);

    const balanceTokenA = await mockAssetERC1155.balanceOf(
      otherAccountAddress,
      erc1155TokenIds[0]
    );
    const balanceTokenB = await mockAssetERC1155.balanceOf(
      otherAccountAddress,
      erc1155TokenIds[1]
    );

    expect(balanceTokenA).to.equal(faucetLimit * 2);
    expect(balanceTokenB).to.equal(20);
  });

  it('Should revert if trying to batch claim for tokens not in the faucet', async function () {
    const {otherAccount, mockAssetERC1155, faucetsERC1155, faucetLimit} =
      await loadFixture(setupFaucetERC1155);
    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const notInFaucetTokenId = 9999;

    await expect(
      faucetsERC1155
        .connect(otherAccount)
        .claimBatch(
          mockAssetERC1155Address,
          [notInFaucetTokenId],
          [faucetLimit]
        )
    ).to.be.revertedWith('Faucets: TOKEN_DOES_NOT_EXIST');
  });

  it('Should correctly determine if a user can claim tokens or not', async function () {
    const {
      otherAccount,
      mockAssetERC1155,
      faucetsERC1155,
      fakeAssets,
      faucetLimit,
      faucetPeriod,
    } = await loadFixture(setupFaucetERC1155);

    const mockAssetERC1155Address = await mockAssetERC1155.getAddress();
    const otherAccountAddress = await otherAccount.getAddress();

    let canClaim = await faucetsERC1155.canClaim(
      mockAssetERC1155Address,
      fakeAssets[0].id,
      otherAccountAddress
    );
    expect(canClaim).to.equal(true);

    await faucetsERC1155
      .connect(otherAccount)
      .claim(mockAssetERC1155Address, fakeAssets[0].id, faucetLimit);

    canClaim = await faucetsERC1155.canClaim(
      mockAssetERC1155Address,
      fakeAssets[0].id,
      otherAccountAddress
    );
    expect(canClaim).to.equal(false);

    await time.increase(faucetPeriod);
    await mine();

    canClaim = await faucetsERC1155.canClaim(
      mockAssetERC1155Address,
      fakeAssets[0].id,
      otherAccountAddress
    );
    expect(canClaim).to.equal(true);
  });
});
