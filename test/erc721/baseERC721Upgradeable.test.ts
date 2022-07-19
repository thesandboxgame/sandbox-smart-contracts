import {setupBaseERC721Upgradeable} from './fixtures';
import {expect} from '../chai-setup';
import {solidityPack} from 'ethers/lib/utils';
import {interfaceSignature} from '../utils';
import {deployments, ethers} from 'hardhat';

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
    describe('super operator', function () {
      it('super operator should be able transfer for any token and user', async function () {
        const {
          other,
          another,
          contractAsOther,
          contractAsSuperOperator,
        } = await setupBaseERC721Upgradeable();
        const tokenId = 123;
        await contractAsOther.mint(other, tokenId);
        expect(await contractAsOther.ownerOf(tokenId)).to.be.equal(other);
        await contractAsSuperOperator.transferFrom(other, another, tokenId);
        expect(await contractAsOther.ownerOf(tokenId)).to.be.equal(another);
      });
      it('other should fail to transfer', async function () {
        const {
          other,
          another,
          contractAsOther,
        } = await setupBaseERC721Upgradeable();
        const tokenId = 123;
        await contractAsOther.mint(another, tokenId);
        await expect(
          contractAsOther.transferFrom(another, other, tokenId)
        ).to.revertedWith('transfer caller is not owner nor approved');
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
  describe('meta tx', function () {
    it('meta tx sender', async function () {
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
    it('meta tx msgData', async function () {
      const {
        contractAsTrustedForwarder,
        contract,
      } = await setupBaseERC721Upgradeable();
      const someData = '0x01020304';
      const txData = await contractAsTrustedForwarder.populateTransaction.msgData(
        someData
      );
      expect(await contract.msgData(someData)).to.be.equal(txData.data);
      // 20 bytes in hex => 40 chars
      expect(await contractAsTrustedForwarder.msgData(someData)).to.be.equal(
        txData.data?.slice(0, txData.data?.length - 40)
      );
    });
  });
  describe('batch transfer', function () {
    it('batch transfer', async function () {
      const {
        other,
        contractAsOther,
        contract,
        another,
      } = await setupBaseERC721Upgradeable();
      const tokenIds = [123, 124];
      for (const t of tokenIds) await contract.mint(other, t);

      await contractAsOther.batchTransferFrom(other, another, tokenIds);
      for (const t of tokenIds)
        expect(await contractAsOther.ownerOf(t)).to.be.equal(another);
    });
    it('safe batch transfer', async function () {
      const {
        other,
        deployer,
        contractAsOther,
        contract,
      } = await setupBaseERC721Upgradeable();
      await deployments.deploy('MockReceiver', {from: deployer});
      const receiver = await ethers.getContract('MockReceiver', other);

      const tokenIds = [123, 124];
      for (const t of tokenIds) await contract.mint(other, t);
      const tx = contractAsOther[
        'safeBatchTransferFrom(address,address,uint256[])'
      ](other, receiver.address, tokenIds);
      for (const t of tokenIds) {
        await expect(tx)
          .to.emit(receiver, 'ReceivedId')
          .withArgs(other, other, t, []);
        expect(await contractAsOther.ownerOf(t)).to.be.equal(receiver.address);
      }
    });
    it('safe batch transfer with data', async function () {
      const {
        other,
        deployer,
        contractAsOther,
        contract,
      } = await setupBaseERC721Upgradeable();
      await deployments.deploy('MockReceiver', {from: deployer});
      const receiver = await ethers.getContract('MockReceiver', other);

      const tokenIds = [123, 124];
      for (const t of tokenIds) await contract.mint(other, t);
      const tx = contractAsOther[
        'safeBatchTransferFrom(address,address,uint256[],bytes)'
      ](other, receiver.address, tokenIds, '0x01020304');
      for (const t of tokenIds) {
        await expect(tx)
          .to.emit(receiver, 'ReceivedId')
          .withArgs(other, other, t, '0x01020304');
        expect(await contractAsOther.ownerOf(t)).to.be.equal(receiver.address);
      }
    });
  });
});
