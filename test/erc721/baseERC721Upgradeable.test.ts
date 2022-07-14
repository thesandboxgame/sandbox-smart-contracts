import {setupBaseERC721Upgradeable} from './fixtures';
import {expect} from '../chai-setup';
import {solidityPack} from 'ethers/lib/utils';
import {interfaceSignature} from '../utils';

describe('erc721 base test', function () {
  it('test initial values', async function () {
    const {
      other,
      trustedForwarder,
      defaultAdmin,
      admin,
      contract,
      name,
      symbol,
    } = await setupBaseERC721Upgradeable();
    expect(await contract.name()).to.be.equal(name);
    expect(await contract.symbol()).to.be.equal(symbol);
    expect(await contract.decimals()).to.be.equal(0);
    expect(await contract.isTrustedForwarder(trustedForwarder)).to.be.true;
    expect(await contract.isTrustedForwarder(other)).to.be.false;
    const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, defaultAdmin)).to.be.true;
    expect(await contract.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.be.false;
  });
  describe('roles', function () {
    describe('admin', function () {
      it('admin should be able to set trusted forwarder', async function () {
        const {
          other,
          trustedForwarder,
          contractAsAdmin,
        } = await setupBaseERC721Upgradeable();
        expect(await contractAsAdmin.isTrustedForwarder(trustedForwarder)).to.be
          .true;
        expect(await contractAsAdmin.isTrustedForwarder(other)).to.be.false;
        await contractAsAdmin.setTrustedForwarder(other);
        expect(await contractAsAdmin.isTrustedForwarder(trustedForwarder)).to.be
          .false;
        expect(await contractAsAdmin.isTrustedForwarder(other)).to.be.true;
      });
      it('other should fail to set trusted forwarder', async function () {
        const {other, contractAsOther} = await setupBaseERC721Upgradeable();
        await expect(
          contractAsOther.setTrustedForwarder(other)
        ).to.revertedWith('not admin');
      });
    });
  });
  it('supported interfaces', async function () {
    const {contract} = await setupBaseERC721Upgradeable();
    // IERC165
    expect(
      await contract.supportsInterface(
        interfaceSignature(contract, 'supportsInterface')
      )
    ).to.be.true;
    // IERC721
    expect(
      await contract.supportsInterface(
        interfaceSignature(contract, [
          'balanceOf',
          'ownerOf',
          'safeTransferFrom(address,address,uint256)',
          'transferFrom',
          'approve',
          'getApproved',
          'setApprovalForAll',
          'isApprovedForAll',
          'safeTransferFrom(address,address,uint256,bytes)',
        ])
      )
    ).to.be.true;
    // IERC721MetadataUpgradeable
    expect(
      await contract.supportsInterface(
        interfaceSignature(contract, ['name', 'symbol', 'tokenURI'])
      )
    ).to.be.true;
    // IERC721MetadataUpgradeable
    expect(
      await contract.supportsInterface(
        interfaceSignature(contract, ['name', 'symbol', 'tokenURI'])
      )
    ).to.be.true;
    // IAccessControlUpgradeable
    expect(
      await contract.supportsInterface(
        interfaceSignature(contract, [
          'hasRole',
          'getRoleAdmin',
          'grantRole',
          'revokeRole',
          'renounceRole',
        ])
      )
    ).to.be.true;
  });
  it('meta tx', async function () {
    const {
      other,
      contractAsTrustedForwarder,
      contract,
    } = await setupBaseERC721Upgradeable();
    expect(await contract.exists(111)).to.be.false;
    await contract.mint(other, 111);
    expect(await contract.exists(111)).to.be.true;
    expect(await contract.ownerOf(111)).to.be.equal(other);

    expect(await contract.exists(123)).to.be.false;
    const txData = await contractAsTrustedForwarder.populateTransaction.mint(
      other,
      123
    );
    // The msg.sender goes at the end.
    txData.data = solidityPack(['bytes', 'address'], [txData.data, other]);
    await contractAsTrustedForwarder.signer.sendTransaction(txData);
    expect(await contract.exists(123)).to.be.true;
    expect(await contract.ownerOf(123)).to.be.equal(other);
  });
});
