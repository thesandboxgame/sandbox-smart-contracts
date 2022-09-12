import {expect} from 'chai';
import {
  SetaupPrePaidPeriodAgreement,
  setaupPrePaidPeriodAgreement,
} from './fixtures';
import {parseEther} from 'ethers/lib/utils';
import {increaseTime} from '../utils';

describe('PrePaidPeriodAgreement', function () {
  describe('process1', function () {
    let fixtures: SetaupPrePaidPeriodAgreement;
    const agreementId = 123;
    // eslint-disable-next-line mocha/no-setup-in-describe
    const rentalPrice = parseEther('123');
    const rentalPeriod = 60 * 60 * 24;
    before(async function () {
      fixtures = await setaupPrePaidPeriodAgreement();
    });
    it('propose', async function () {
      const {
        user,
        owner,
        contractAsOwner,
        leaseMock,
        mintableERC20,
        contract,
      } = fixtures;
      await mintableERC20.mint(user, rentalPrice.mul(4));
      await leaseMock.setAgreement(agreementId, contract.address, owner, user);

      await expect(
        contractAsOwner.propose(agreementId, rentalPrice, rentalPeriod)
      )
        .to.emit(contractAsOwner, 'AgreementProposed')
        .withArgs(agreementId, rentalPrice, rentalPeriod, user, owner);
      const agreement = await contract.getAgreement(agreementId);
      expect(agreement.rentalPrice).to.be.equal(rentalPrice.add(1));
      expect(agreement.rentalPeriod).to.be.equal(rentalPeriod);
      expect(agreement.expiration).to.be.equal(0);
      expect(agreement.cancellationPenalty).to.be.equal(0);
      expect(await contract.isLeased(agreementId)).to.be.false;
    });
    it('accept', async function () {
      const {contractAsUser, mintableERC20AsUser, contract, owner} = fixtures;
      await mintableERC20AsUser.approve(contractAsUser.address, rentalPrice);
      await expect(
        contractAsUser.accept(agreementId, rentalPrice, rentalPeriod)
      )
        .to.emit(contractAsUser, 'AgreementAccepted')
        .withArgs(agreementId, rentalPrice, rentalPeriod, [], []);
      expect(await contract.balanceOf(owner)).to.be.equal(rentalPrice);
      expect(await contract.isLeased(agreementId)).to.be.true;
      await increaseTime(rentalPeriod + 10);
      expect(await contract.isLeased(agreementId)).to.be.false;
    });
    it('renew', async function () {
      const {
        user,
        owner,
        contractAsOwner,
        contractAsUser,
        mintableERC20AsUser,
        contract,
      } = fixtures;
      await expect(
        contractAsOwner.propose(agreementId, rentalPrice, rentalPeriod)
      )
        .to.emit(contractAsOwner, 'AgreementProposed')
        .withArgs(agreementId, rentalPrice, rentalPeriod, user, owner);
      expect(await contract.isLeased(agreementId)).to.be.false;

      await mintableERC20AsUser.approve(contractAsUser.address, rentalPrice);
      await expect(
        contractAsUser.accept(agreementId, rentalPrice, rentalPeriod)
      )
        .to.emit(contractAsUser, 'AgreementAccepted')
        .withArgs(agreementId, rentalPrice, rentalPeriod, [], []);
      expect(await contract.balanceOf(owner)).to.be.equal(rentalPrice.mul(2));
      expect(await contract.isLeased(agreementId)).to.be.true;
      await increaseTime(rentalPeriod + 10);
      expect(await contract.isLeased(agreementId)).to.be.false;
    });
    it('renew again', async function () {
      const {
        user,
        owner,
        contractAsOwner,
        contractAsUser,
        mintableERC20AsUser,
        contract,
      } = fixtures;
      await expect(
        contractAsOwner.propose(agreementId, rentalPrice, rentalPeriod)
      )
        .to.emit(contractAsOwner, 'AgreementProposed')
        .withArgs(agreementId, rentalPrice, rentalPeriod, user, owner);
      expect(await contract.isLeased(agreementId)).to.be.false;

      await mintableERC20AsUser.approve(contractAsUser.address, rentalPrice);
      await expect(
        contractAsUser.accept(agreementId, rentalPrice, rentalPeriod)
      )
        .to.emit(contractAsUser, 'AgreementAccepted')
        .withArgs(agreementId, rentalPrice, rentalPeriod, [], []);
      expect(await contract.balanceOf(owner)).to.be.equal(rentalPrice.mul(3));
      expect(await contract.isLeased(agreementId)).to.be.true;
    });
    it('and then cancel', async function () {
      const {user, owner, contractAsOwner, contractAsUser, contract} = fixtures;
      await expect(contractAsUser.proposeCancellation(agreementId, rentalPrice))
        .to.emit(contractAsUser, 'CancellationProposed')
        .withArgs(agreementId, user, owner, [], rentalPrice);
      expect(await contract.isLeased(agreementId)).to.be.true;
      const agreement = await contract.getAgreement(agreementId);
      expect(agreement.cancellationPenalty).to.be.equal(rentalPrice.add(1));
      await expect(contractAsOwner.acceptCancellation(agreementId, rentalPrice))
        .to.emit(contractAsOwner, 'CancellationAccepted')
        .withArgs(agreementId, user, owner, rentalPrice);
      expect(await contract.balanceOf(owner)).to.be.equal(rentalPrice.mul(2));
      expect(await contract.isLeased(agreementId)).to.be.false;
    });
  });
});
