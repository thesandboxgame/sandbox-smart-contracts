import {ethers} from 'hardhat';
import {expect} from '../chai-setup';
import {setupFaucetERC1155} from './fixtures';
import {BigNumber, Contract, Signer} from 'ethers';
import {increaseTime} from '../utils';

describe('FaucetsERC1155', function () {
  let faucetsERC1155: Contract;
  let mockAssetERC1155: Contract;
  let owner: Signer;
  let user1: Signer;
  let erc1155TokenIds: Array<BigNumber> = [];

  const erc1155Amounts = [100000, 50];
  const faucetPeriod = 3600;
  const faucetLimit = 100;

  beforeEach(async function () {
    const setup = await setupFaucetERC1155();
    faucetsERC1155 = setup.faucetsERC1155;
    mockAssetERC1155 = setup.mockAssetERC1155;
    const {mintAssetERC1155} = setup;

    [owner, user1] = await ethers.getSigners();
    const ownerAddress = await owner.getAddress();

    const {tokenId: tokenIdA} = await mintAssetERC1155({
      creatorAddress: ownerAddress,
      packId: 1,
      hash:
        '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b403e',
      supply: erc1155Amounts[0],
      ownerAddress: ownerAddress,
      data: '0x',
    });

    const {tokenId: tokenIdB} = await mintAssetERC1155({
      creatorAddress: ownerAddress,
      packId: 2,
      hash:
        '0x78b9f42c22c3c8b260b781578da3151e8200c741c6b7437bafaff5a9df9b404e',
      supply: erc1155Amounts[1],
      ownerAddress: ownerAddress,
      data: '0x',
    });

    erc1155TokenIds = [tokenIdA, tokenIdB];

    await faucetsERC1155
      .connect(owner)
      .addFaucet(
        mockAssetERC1155.address,
        faucetPeriod,
        faucetLimit,
        erc1155TokenIds
      );
    await mockAssetERC1155
      .connect(owner)
      .safeBatchTransferFrom(
        ownerAddress,
        faucetsERC1155.address,
        erc1155TokenIds,
        erc1155Amounts,
        '0x'
      );
  });

  it('Should allow a user to claim ERC1155 tokens', async function () {
    await faucetsERC1155
      .connect(user1)
      .claim(mockAssetERC1155.address, erc1155TokenIds[0], faucetLimit);
    const user1Balance = await mockAssetERC1155.balanceOf(
      await user1.getAddress(),
      erc1155TokenIds[0]
    );
    expect(user1Balance).to.equal(faucetLimit);
  });

  it('Should not allow a user to claim more than the limit', async function () {
    await expect(
      faucetsERC1155
        .connect(user1)
        .claim(mockAssetERC1155.address, erc1155TokenIds[0], faucetLimit + 1)
    ).to.be.revertedWith('Faucets: AMOUNT_TOO_HIGH');
  });

  it('Should not allow a user to claim before the faucet period expires', async function () {
    await faucetsERC1155
      .connect(user1)
      .claim(mockAssetERC1155.address, erc1155TokenIds[0], faucetLimit);
    await expect(
      faucetsERC1155
        .connect(user1)
        .claim(mockAssetERC1155.address, erc1155TokenIds[0], faucetLimit)
    ).to.be.revertedWith('Faucets: CLAIM_PERIOD_NOT_PASSED');
  });

  it('Should allow a user to claim after the faucet period expires', async function () {
    await faucetsERC1155
      .connect(user1)
      .claim(mockAssetERC1155.address, erc1155TokenIds[0], faucetLimit);

    await increaseTime(faucetPeriod + 1, true);

    await faucetsERC1155
      .connect(user1)
      .claim(mockAssetERC1155.address, erc1155TokenIds[0], faucetLimit);
    const user1Balance = await mockAssetERC1155.balanceOf(
      await user1.getAddress(),
      erc1155TokenIds[0]
    );
    expect(user1Balance).to.equal(faucetLimit * 2);
  });

  it("Should not allow a user to claim if the faucet doesn't have enough tokens", async function () {
    const highAmount = erc1155Amounts[1] + 1;
    await expect(
      faucetsERC1155
        .connect(user1)
        .claim(mockAssetERC1155.address, erc1155TokenIds[1], highAmount)
    ).to.be.revertedWith('Faucets: BALANCE_IS_NOT_ENOUGH');
  });

  it("Should correctly get the faucet's period", async function () {
    const period = await faucetsERC1155.getPeriod(mockAssetERC1155.address);
    expect(period).to.equal(faucetPeriod);
  });

  it('Should allow the owner to set a new faucet period', async function () {
    const newPeriod = 7200;
    await faucetsERC1155
      .connect(owner)
      .setPeriod(mockAssetERC1155.address, newPeriod);

    const updatedPeriod = await faucetsERC1155.getPeriod(
      mockAssetERC1155.address
    );
    expect(updatedPeriod).to.equal(newPeriod);
  });

  it('Should not allow a non-owner to set a new faucet period', async function () {
    const newPeriod = 7200;
    await expect(
      faucetsERC1155
        .connect(user1)
        .setPeriod(mockAssetERC1155.address, newPeriod)
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it("Should allow the owner to withdraw all the faucet's tokens", async function () {
    const faucetBalanceBefore = await mockAssetERC1155.balanceOf(
      faucetsERC1155.address,
      erc1155TokenIds[0]
    );
    expect(faucetBalanceBefore).to.be.gt(0);

    await faucetsERC1155
      .connect(owner)
      .withdraw(
        mockAssetERC1155.address,
        await owner.getAddress(),
        erc1155TokenIds
      );

    const faucetBalanceAfter = await mockAssetERC1155.balanceOf(
      faucetsERC1155.address,
      erc1155TokenIds[0]
    );
    const ownerBalanceAfter = await mockAssetERC1155.balanceOf(
      await owner.getAddress(),
      erc1155TokenIds[0]
    );

    expect(faucetBalanceAfter).to.equal(0);
    expect(ownerBalanceAfter).to.equal(faucetBalanceBefore);
  });

  it("Should not allow a non-owner to withdraw the faucet's tokens", async function () {
    await expect(
      faucetsERC1155
        .connect(user1)
        .withdraw(
          mockAssetERC1155.address,
          await user1.getAddress(),
          erc1155TokenIds
        )
    ).to.be.revertedWith('Ownable: caller is not the owner');
  });

  it('Should allow a user to batch claim multiple ERC1155 tokens from a single faucet', async function () {
    const claimAmounts = [faucetLimit, erc1155Amounts[1] - 1];

    await faucetsERC1155
      .connect(user1)
      .claimBatch(mockAssetERC1155.address, erc1155TokenIds, claimAmounts);

    const user1BalanceTokenA = await mockAssetERC1155.balanceOf(
      await user1.getAddress(),
      erc1155TokenIds[0]
    );
    const user1BalanceTokenB = await mockAssetERC1155.balanceOf(
      await user1.getAddress(),
      erc1155TokenIds[1]
    );

    expect(user1BalanceTokenA).to.equal(claimAmounts[0]);
    expect(user1BalanceTokenB).to.equal(claimAmounts[1]);
  });

  it('Should not allow a user to batch claim amounts greater than the set limits', async function () {
    const excessiveAmounts = [faucetLimit + 1, erc1155Amounts[1] + 1];

    await expect(
      faucetsERC1155
        .connect(user1)
        .claimBatch(mockAssetERC1155.address, erc1155TokenIds, excessiveAmounts)
    ).to.be.revertedWith('Faucets: AMOUNT_TOO_HIGH');
  });

  it('Should not allow a user to batch claim before the faucet period expires', async function () {
    await faucetsERC1155
      .connect(user1)
      .claimBatch(mockAssetERC1155.address, erc1155TokenIds, [faucetLimit, 10]);

    await expect(
      faucetsERC1155
        .connect(user1)
        .claimBatch(mockAssetERC1155.address, erc1155TokenIds, [
          faucetLimit,
          10,
        ])
    ).to.be.revertedWith('Faucets: CLAIM_PERIOD_NOT_PASSED');
  });

  it('Should allow a user to batch claim after the faucet period expires', async function () {
    await faucetsERC1155
      .connect(user1)
      .claimBatch(mockAssetERC1155.address, erc1155TokenIds, [faucetLimit, 10]);

    await increaseTime(faucetPeriod + 1, true);

    await faucetsERC1155
      .connect(user1)
      .claimBatch(mockAssetERC1155.address, erc1155TokenIds, [faucetLimit, 10]);

    const user1BalanceTokenA = await mockAssetERC1155.balanceOf(
      await user1.getAddress(),
      erc1155TokenIds[0]
    );
    const user1BalanceTokenB = await mockAssetERC1155.balanceOf(
      await user1.getAddress(),
      erc1155TokenIds[1]
    );

    expect(user1BalanceTokenA).to.equal(faucetLimit * 2);
    expect(user1BalanceTokenB).to.equal(20);
  });

  it('Should revert if trying to batch claim for tokens not in the faucet', async function () {
    const notInFaucetTokenId = BigNumber.from('9999');
    await expect(
      faucetsERC1155
        .connect(user1)
        .claimBatch(
          mockAssetERC1155.address,
          [notInFaucetTokenId],
          [faucetLimit]
        )
    ).to.be.revertedWith('Faucets: TOKEN_DOES_NOT_EXIST');
  });
});
