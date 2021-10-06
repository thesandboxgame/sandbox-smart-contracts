import {expect} from 'chai';
import {setupEstateSale, backendAuthWallet} from './fixtures';

describe('WithReferralValidator', function () {
  it('should be able to update the signing wallet', async function () {
    const {
      estateSaleWithAuthContract,
      getNamedAccounts,
      ethers,
    } = await setupEstateSale();
    const {sandAdmin} = await getNamedAccounts();
    const newSigner = '0xD1Df0BB44804f4Ac75286E9b1AE66c27CBCb5c7C';

    await estateSaleWithAuthContract
      .connect(ethers.provider.getSigner(sandAdmin))
      .updateSigningWallet(newSigner);

    const newWallet = await estateSaleWithAuthContract.getSigningWallet();

    expect(newWallet).to.equal(newSigner);
  });
  it('should be able to update the comission rate', async function () {
    const {
      estateSaleWithAuthContract,
      getNamedAccounts,
      ethers,
    } = await setupEstateSale();
    const {sandAdmin} = await getNamedAccounts();
    const newRate = '1000';

    await estateSaleWithAuthContract
      .connect(ethers.provider.getSigner(sandAdmin))
      .updateMaxCommissionRate(newRate);

    const rate = await estateSaleWithAuthContract.getMaxCommisionRate();

    expect(rate).to.equal(newRate);
  });
  it('referral should be valid', async function () {
    const {estateSaleWithAuthContract, ethers} = await setupEstateSale();
    const referee = '0xD1Df0BB44804f4Ac75286E9b1AE66c27CBCb5c7C';

    const hashedData = ethers.utils.solidityKeccak256(
      ['address', 'address', 'uint256', 'uint256'],
      [
        estateSaleWithAuthContract.address,
        referee,
        '1759722874', // Monday, October 6, 2025 3:54:34 AM
        '500',
      ]
    );

    const signature = await backendAuthWallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const res = await estateSaleWithAuthContract.isReferralValid(
      signature,
      estateSaleWithAuthContract.address,
      referee,
      '1759722874', // Monday, October 6, 2025 3:54:34 AM
      '500'
    );

    expect(res).to.equal(true);
  });
  it('referral should be ivalid - timestamp', async function () {
    const {estateSaleWithAuthContract, ethers} = await setupEstateSale();
    const referee = '0xD1Df0BB44804f4Ac75286E9b1AE66c27CBCb5c7C';

    const hashedData = ethers.utils.solidityKeccak256(
      ['address', 'address', 'uint256', 'uint256'],
      [estateSaleWithAuthContract.address, referee, '10000', '500']
    );

    const signature = await backendAuthWallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const res = await estateSaleWithAuthContract.isReferralValid(
      signature,
      estateSaleWithAuthContract.address,
      referee,
      '10000',
      '500'
    );

    expect(res).to.equal(false);
  });
  it('referral should be ivalid - referrer == referee', async function () {
    const {estateSaleWithAuthContract, ethers} = await setupEstateSale();
    const referee = '0xD1Df0BB44804f4Ac75286E9b1AE66c27CBCb5c7C';

    const hashedData = ethers.utils.solidityKeccak256(
      ['address', 'address', 'uint256', 'uint256'],
      [
        referee,
        referee,
        '1759722874', // Monday, October 6, 2025 3:54:34 AM
        '500',
      ]
    );

    const signature = await backendAuthWallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const res = await estateSaleWithAuthContract.isReferralValid(
      signature,
      referee,
      referee,
      '1759722874', // Monday, October 6, 2025 3:54:34 AM
      '500'
    );

    expect(res).to.equal(false);
  });
  it('referral should be ivalid - comissionRate', async function () {
    const {estateSaleWithAuthContract, ethers} = await setupEstateSale();
    const referee = '0xD1Df0BB44804f4Ac75286E9b1AE66c27CBCb5c7C';

    const hashedData = ethers.utils.solidityKeccak256(
      ['address', 'address', 'uint256', 'uint256'],
      [
        estateSaleWithAuthContract.address,
        referee,
        '1759722874', // Monday, October 6, 2025 3:54:34 AM
        '3500',
      ]
    );

    const signature = await backendAuthWallet.signMessage(
      ethers.utils.arrayify(hashedData)
    );

    const res = await estateSaleWithAuthContract.isReferralValid(
      signature,
      referee,
      referee,
      '1759722874', // Monday, October 6, 2025 3:54:34 AM
      '3500'
    );

    expect(res).to.equal(false);
  });
});
