import {expect} from 'chai';
import {getMessageFromTx, setupFxAvatarTunnelIntegrationTest} from './fixtures';
import {deployments, ethers} from 'hardhat';

describe('FxAvatarTunnel Integration Test', function () {
  before(async function () {
    this.tokenId = 123;
    this.fixtures = await setupFxAvatarTunnelIntegrationTest();
  });
  it('should start with no token', async function () {
    expect(await this.fixtures.childAvatarToken.exists(this.tokenId)).to.be
      .false;
    expect(await this.fixtures.rootAvatarToken.exists(this.tokenId)).to.be
      .false;
  });
  it('should success to mint on L2', async function () {
    const minterRole = await deployments.read('PolygonAvatar', 'MINTER_ROLE');
    await deployments.execute(
      'PolygonAvatar',
      {from: this.fixtures.adminRole, log: true},
      'grantRole',
      minterRole,
      this.fixtures.minter
    );
    const avatarAsMinter = await ethers.getContract(
      'PolygonAvatar',
      this.fixtures.minter
    );
    await avatarAsMinter.mint(this.fixtures.dstChild, this.tokenId);

    expect(
      await this.fixtures.childAvatarToken.ownerOf(this.tokenId)
    ).to.be.equal(this.fixtures.dstChild);
    expect(await this.fixtures.rootAvatarToken.exists(this.tokenId)).to.be
      .false;
  });
  it('send to L1: lock on L2, mint on L1', async function () {
    const avatarAsDstChild = await ethers.getContract(
      'PolygonAvatar',
      this.fixtures.dstChild
    );
    await avatarAsDstChild.approve(
      this.fixtures.childAvatarTunnel.address,
      this.tokenId
    );
    const childAvatarTunnelAsDstChild = await ethers.getContract(
      'PolygonAvatarTunnel',
      this.fixtures.dstChild
    );
    const tx = await childAvatarTunnelAsDstChild.sendAvatarToL1(
      this.fixtures.dstRoot,
      this.tokenId
    );
    const message = await getMessageFromTx(tx);
    await this.fixtures.rootAvatarTunnel.processMessageFromChild(message);

    expect(
      await this.fixtures.childAvatarToken.ownerOf(this.tokenId)
    ).to.be.equal(this.fixtures.childAvatarTunnel.address);
    expect(
      await this.fixtures.rootAvatarToken.ownerOf(this.tokenId)
    ).to.be.equal(this.fixtures.dstRoot);
  });
  it('send back to L2: lock on L1, transfer on L2', async function () {
    const avatarAsDstRoot = await ethers.getContract(
      'Avatar',
      this.fixtures.dstRoot
    );
    await avatarAsDstRoot.approve(
      this.fixtures.rootAvatarTunnel.address,
      this.tokenId
    );
    const rootAvatarTunnelAsDstRoot = await ethers.getContract(
      'AvatarTunnel',
      this.fixtures.dstRoot
    );
    await rootAvatarTunnelAsDstRoot.sendAvatarToL2(
      this.fixtures.dstChild2,
      this.tokenId
    );
    expect(
      await this.fixtures.childAvatarToken.ownerOf(this.tokenId)
    ).to.be.equal(this.fixtures.dstChild2);
    expect(
      await this.fixtures.rootAvatarToken.ownerOf(this.tokenId)
    ).to.be.equal(this.fixtures.rootAvatarTunnel.address);
  });
  it('send back to L1: lock on L2, transfer on L1', async function () {
    const polygonAvatarAsDstChild2 = await ethers.getContract(
      'PolygonAvatar',
      this.fixtures.dstChild2
    );
    await polygonAvatarAsDstChild2.approve(
      this.fixtures.childAvatarTunnel.address,
      this.tokenId
    );
    const childAvatarTunnelAsDstChild2 = await ethers.getContract(
      'PolygonAvatarTunnel',
      this.fixtures.dstChild2
    );
    const tx = await childAvatarTunnelAsDstChild2.sendAvatarToL1(
      this.fixtures.dstRoot2,
      this.tokenId
    );
    const message = await getMessageFromTx(tx);
    await this.fixtures.rootAvatarTunnel.processMessageFromChild(message);

    expect(
      await this.fixtures.childAvatarToken.ownerOf(this.tokenId)
    ).to.be.equal(this.fixtures.childAvatarTunnel.address);
    expect(
      await this.fixtures.rootAvatarToken.ownerOf(this.tokenId)
    ).to.be.equal(this.fixtures.dstRoot2);
  });
});
