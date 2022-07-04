import {setupBaseERC721Upgradeable} from './fixtures';
import {expect} from '../chai-setup';

describe('erc721 base test', function () {
  it(`test initial values`, async function () {
    const {
      other,
      trustedForwarder,
      admin,
      contractAsDeployer,
      name,
      symbol,
    } = await setupBaseERC721Upgradeable();
    expect(await contractAsDeployer.name()).to.be.equal(name);
    expect(await contractAsDeployer.symbol()).to.be.equal(symbol);
    expect(await contractAsDeployer.isTrustedForwarder(trustedForwarder)).to.be
      .true;
    expect(await contractAsDeployer.isTrustedForwarder(other)).to.be.false;
    const DEFAULT_ADMIN_ROLE = await contractAsDeployer.DEFAULT_ADMIN_ROLE();
    expect(await contractAsDeployer.hasRole(DEFAULT_ADMIN_ROLE, admin)).to.be
      .true;
    expect(await contractAsDeployer.hasRole(DEFAULT_ADMIN_ROLE, other)).to.be
      .false;

    // await contractAsDeployer.mint(other);
  });
  // describe('roles', function () {
  //   describe('admin', function () {});
  //   describe('super operator', function () {});
  // });
});
