import {expect} from 'chai';
import {setupLease} from './fixtures';

describe('Lease.sol', function () {
  it('create', async function () {
    const {
      user,
      owner,
      leaseImplMock,
      mintableERC721,
      contractAsOwner,
    } = await setupLease();
    const tokenId = 123;
    await mintableERC721.mint(owner, tokenId);
    const agreementId = await contractAsOwner.getAgreementId(
      mintableERC721.address,
      tokenId
    );
    await expect(
      contractAsOwner.create(
        mintableERC721.address,
        tokenId,
        user,
        leaseImplMock.address
      )
    )
      .to.emit(contractAsOwner, 'LeaseAgreementCreated')
      .withArgs(
        agreementId,
        mintableERC721.address,
        tokenId,
        user,
        owner,
        leaseImplMock.address
      );
    expect(await contractAsOwner['isLeased(uint256)'](agreementId)).to.be.false;
    expect(await contractAsOwner['ownerOf(uint256)'](agreementId)).to.be.equal(
      user
    );
    expect(await mintableERC721.ownerOf(tokenId)).to.be.equal(owner);
    expect(
      await contractAsOwner['getAgreement(uint256)'](agreementId)
    ).to.be.eql([leaseImplMock.address, owner, user]);
  });
  it('destroy', async function () {
    const {
      user,
      owner,
      leaseImplMock,
      mintableERC721,
      contractAsOwner,
    } = await setupLease();
    const tokenId = 123;
    await mintableERC721.mint(owner, tokenId);
    const agreementId = await contractAsOwner.getAgreementId(
      mintableERC721.address,
      tokenId
    );
    await contractAsOwner.create(
      mintableERC721.address,
      tokenId,
      user,
      leaseImplMock.address
    );
    expect(await contractAsOwner['exists(uint256)'](agreementId)).to.be.true;
    expect(
      await contractAsOwner['getAgreement(uint256)'](agreementId)
    ).to.be.eql([leaseImplMock.address, owner, user]);

    const destroyAssert = expect(
      contractAsOwner['destroy(uint256)'](agreementId)
    );
    await destroyAssert.to
      .emit(contractAsOwner, 'LeaseAgreementDestroyed')
      .withArgs(
        agreementId,
        mintableERC721.address,
        tokenId,
        user,
        owner,
        leaseImplMock.address
      );
    await destroyAssert.to.emit(leaseImplMock, 'Clean').withArgs(agreementId);
    expect(await contractAsOwner['exists(uint256)'](agreementId)).to.be.false;
  });
  it('destroy and recreate', async function () {
    const {
      other,
      user,
      owner,
      leaseImplMock,
      mintableERC721,
      contractAsOwner,
    } = await setupLease();
    const tokenId = 123;
    await mintableERC721.mint(owner, tokenId);
    const agreementId = await contractAsOwner.getAgreementId(
      mintableERC721.address,
      tokenId
    );
    await contractAsOwner.create(
      mintableERC721.address,
      tokenId,
      user,
      leaseImplMock.address
    );
    expect(await contractAsOwner['ownerOf(uint256)'](agreementId)).to.be.equal(
      user
    );
    await contractAsOwner['destroy(uint256)'](agreementId);

    await contractAsOwner.create(
      mintableERC721.address,
      tokenId,
      other,
      leaseImplMock.address
    );
    expect(await contractAsOwner['ownerOf(uint256)'](agreementId)).to.be.equal(
      other
    );
  });
});
