import {expect} from 'chai';
import {onlyOwner, setupAvatarTunnelTest} from './fixtures';
import {selector} from '../../utils';
import {AddressZero} from '@ethersproject/constants';
import {solidityPack} from 'ethers/lib/utils';
import {ethers} from 'hardhat';

describe('AvatarTunnel.sol', function () {
  describe('owner', function () {
    it('owner is set', async function () {
      const fixtures = await setupAvatarTunnelTest();
      expect(await fixtures.avatarTunnelAsOwner.owner()).to.be.equal(
        fixtures.owner
      );
    });
    // eslint-disable-next-line mocha/no-setup-in-describe
    onlyOwner(
      setupAvatarTunnelTest,
      'setTrustedForwarder',
      'getTrustedForwarder'
    );
    // eslint-disable-next-line mocha/no-setup-in-describe
    onlyOwner(setupAvatarTunnelTest, 'setRootAvatarToken', 'rootAvatarToken');
    // eslint-disable-next-line mocha/no-setup-in-describe
    onlyOwner(setupAvatarTunnelTest, 'setChildTunnel', 'fxChildTunnel');
  });
  describe('sendAvatarToL2', function () {
    it('should success to send to L2', async function () {
      const tokenId = 123;
      const fixtures = await setupAvatarTunnelTest();
      await fixtures.avatarTunnelAsOwner.setChildTunnel(fixtures.fxChildTunnel);
      await fixtures.rootAvatarToken['mint(address,uint256)'](
        fixtures.other,
        tokenId
      );
      await fixtures.rootAvatarTokenAsOther.approve(
        fixtures.contract.address,
        tokenId
      );
      const tx = fixtures.avatarTunnelAsOther.sendAvatarToL2(
        fixtures.dst,
        tokenId
      );
      await expect(tx)
        .to.emit(fixtures.avatarTunnelAsOwner, 'AvatarSentToL2')
        .withArgs(
          fixtures.rootAvatarToken.address,
          fixtures.other,
          fixtures.dst,
          tokenId
        );
      await expect(tx)
        .to.emit(fixtures.fxRoot, 'SendingMessageToChild')
        .withArgs(
          fixtures.fxChildTunnel,
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint256'],
            [fixtures.other, fixtures.dst, tokenId]
          )
        );
      // Avatar locked in tunnel
      expect(await fixtures.rootAvatarToken.ownerOf(tokenId)).to.be.equal(
        fixtures.contract.address
      );
    });
    it('should fail to send to L2 if fxChildTunnel is not set', async function () {
      const tokenId = 123;
      const fixtures = await setupAvatarTunnelTest();
      await expect(
        fixtures.avatarTunnelAsOther.sendAvatarToL2(fixtures.dst, tokenId)
      ).to.revertedWith('fxChildTunnel must be set');
    });
    it('should fail to send to L2 address ZERO', async function () {
      const tokenId = 123;
      const fixtures = await setupAvatarTunnelTest();
      await fixtures.avatarTunnelAsOwner.setChildTunnel(fixtures.fxChildTunnel);
      await expect(
        fixtures.avatarTunnelAsOther.sendAvatarToL2(AddressZero, tokenId)
      ).to.revertedWith('INVALID_USER');
    });
  });
  describe('receiveAvatarFromL2', function () {
    it('should success to receive from L2 using Mock', async function () {
      const tokenId = 123;
      const fixtures = await setupAvatarTunnelTest();
      const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [fixtures.other, fixtures.dst, tokenId]
      );
      await expect(
        fixtures.avatarTunnelAsOther.processMessageFromChild(message)
      )
        .to.emit(fixtures.contract, 'AvatarReceivedFromL2')
        .withArgs(
          fixtures.rootAvatarToken.address,
          fixtures.other,
          fixtures.dst,
          true,
          tokenId
        );
      expect(await fixtures.rootAvatarToken.ownerOf(tokenId)).to.be.equal(
        fixtures.dst
      );
    });
    it('should fail to receive from L2 if fxChildTunnel is not set', async function () {
      const tokenId = 123;
      const fixtures = await setupAvatarTunnelTest();
      const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [fixtures.other, fixtures.dst, tokenId]
      );
      await expect(
        fixtures.avatarTunnelAsOther.receiveAvatarFromL2(message)
      ).to.revertedWith('fxChildTunnel must be set');
    });
  });
  describe('meta transactions', function () {
    it('should success to send to L2', async function () {
      const tokenId = 123;
      const fixtures = await setupAvatarTunnelTest();
      await fixtures.avatarTunnelAsOwner.setChildTunnel(fixtures.fxChildTunnel);
      await fixtures.rootAvatarToken['mint(address,uint256)'](
        fixtures.other,
        tokenId
      );
      await fixtures.rootAvatarTokenAsOther.approve(
        fixtures.contract.address,
        tokenId
      );
      const contractAsTrustedForwarder = await ethers.getContract(
        'AvatarTunnel',
        fixtures.trustedForwarder
      );
      const txData = await contractAsTrustedForwarder.populateTransaction.sendAvatarToL2(
        fixtures.dst,
        tokenId
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      const tx = contractAsTrustedForwarder.signer.sendTransaction(txData);
      await expect(tx)
        .to.emit(fixtures.avatarTunnelAsOwner, 'AvatarSentToL2')
        .withArgs(
          fixtures.rootAvatarToken.address,
          fixtures.other,
          fixtures.dst,
          tokenId
        );
      await expect(tx)
        .to.emit(fixtures.fxRoot, 'SendingMessageToChild')
        .withArgs(
          fixtures.fxChildTunnel,
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint256'],
            [fixtures.other, fixtures.dst, tokenId]
          )
        );
      // Avatar locked in tunnel
      expect(await fixtures.rootAvatarToken.ownerOf(tokenId)).to.be.equal(
        fixtures.contract.address
      );
    });
    it('should success to receive from L2', async function () {
      const tokenId = 123;
      const fixtures = await setupAvatarTunnelTest();
      const contractAsTrustedForwarder = await ethers.getContract(
        'AvatarTunnel',
        fixtures.trustedForwarder
      );
      const message = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address', 'uint256'],
        [fixtures.other, fixtures.dst, tokenId]
      );
      const txData = await contractAsTrustedForwarder.populateTransaction.processMessageFromChild(
        message
      );
      // The msg.sender goes at the end.
      txData.data = solidityPack(
        ['bytes', 'address'],
        [txData.data, fixtures.other]
      );
      const tx = contractAsTrustedForwarder.signer.sendTransaction(txData);
      await expect(tx)
        .to.emit(fixtures.contract, 'AvatarReceivedFromL2')
        .withArgs(
          fixtures.rootAvatarToken.address,
          fixtures.other,
          fixtures.dst,
          true,
          tokenId
        );
      expect(await fixtures.rootAvatarToken.ownerOf(tokenId)).to.be.equal(
        fixtures.dst
      );
    });
  });
  it('coverage', async function () {
    const fixtures = await setupAvatarTunnelTest();
    const onERC721Received = 'onERC721Received(address,address,uint256,bytes)';
    const onERC721BatchReceived =
      'onERC721BatchReceived(address,address,uint256[],bytes)';
    expect(
      await fixtures.avatarTunnelAsOwner.onERC721Received(
        AddressZero,
        AddressZero,
        0,
        []
      )
    ).to.be.equal(selector(onERC721Received));
    expect(
      await fixtures.avatarTunnelAsOwner.onERC721BatchReceived(
        AddressZero,
        AddressZero,
        [],
        []
      )
    ).to.be.equal(selector(onERC721BatchReceived));
    expect(
      await fixtures.avatarTunnelAsOwner.supportsInterface(
        selector('supportsInterface(bytes4)')
      )
    ).to.be.true;
    expect(
      await fixtures.avatarTunnelAsOwner.supportsInterface(
        selector(onERC721Received)
      )
    ).to.be.true;
    expect(
      await fixtures.avatarTunnelAsOwner.supportsInterface(
        selector([onERC721Received, onERC721BatchReceived])
      )
    ).to.be.true;
  });
});
