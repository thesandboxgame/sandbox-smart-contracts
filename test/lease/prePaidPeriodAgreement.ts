import {expect} from 'chai';
import {setaupPrePaidPeriodAgreement} from './fixtures';
import {parseEther} from 'ethers/lib/utils';
import {getTime, increaseTime, setNextBlockTime} from '../utils';

describe('Lease.sol', function () {
  it('propose -> accept', async function () {
    const {
      user,
      owner,
      contractAsOwner,
      contractAsUser,
      leaseMock,
      mintableERC20,
      mintableERC20AsUser,
      contract,
    } = await setaupPrePaidPeriodAgreement();
    const agreementId = 123;
    const rentalPrice = parseEther('123');
    const rentalPeriod = 60 * 60 * 24;
    await mintableERC20.mint(user, rentalPrice);
    await leaseMock.setAgreement(agreementId, contract.address, owner, user);

    await expect(
      contractAsOwner.propose(agreementId, rentalPrice, rentalPeriod)
    )
      .to.emit(contractAsOwner, 'AgreementProposed')
      .withArgs(agreementId, rentalPrice, rentalPeriod, 1, user, owner);
    const agreement = await contract.getAgreement(agreementId);
    expect(agreement.leaseProposal.nonce).to.be.equal(1);
    expect(agreement.leaseProposal.rentalPrice).to.be.equal(rentalPrice);
    expect(agreement.leaseProposal.rentalPeriod).to.be.equal(rentalPeriod);
    expect(agreement.expiration).to.be.equal(0);
    expect(agreement.cancellationPenalty).to.be.equal(0);
    expect(await contract.isLeased(agreementId)).to.be.false;

    await mintableERC20AsUser.approve(contractAsUser.address, rentalPrice);
    await expect(contractAsUser.accept(agreementId, 1))
      .to.emit(contractAsUser, 'AgreementAccepted')
      .withArgs(agreementId, rentalPrice, rentalPeriod, 1, [], []);
    expect(await contract.isLeased(agreementId)).to.be.true;
    await increaseTime(rentalPeriod + 10);
    expect(await contract.isLeased(agreementId)).to.be.false;
  });
});
