import {setupPolygonKYCToken} from './fixtures';
import {
  waitFor,
  expectEventWithArgs,
  expectEventWithArgsFromReceipt,
} from '../../utils';
import {expect} from '../../chai-setup';
import {ethers} from 'hardhat';
import {BigNumber} from '@ethersproject/bignumber';
import {constants, utils} from 'ethers';
import {zeroAddress} from '../../land/fixtures';
import {backendAuthWallet} from '../../land-sale/fixtures';

describe('PolygonKYCToken', function () {
  describe('roles', function () {
    it('default admin role was granted to kyc admin at initialization', async function () {
      const {
        PolygonKYCToken,
        kycAdmin,
        defaultAdminRole,
      } = await setupPolygonKYCToken();
      expect(await PolygonKYCToken.hasRole(defaultAdminRole, kycAdmin)).to.be
        .true;
    });
    it('minter role was granted to backendKYCWallet at initialization', async function () {
      const {
        PolygonKYCToken,
        minterRole,
        backendKYCWallet,
      } = await setupPolygonKYCToken();
      expect(await PolygonKYCToken.hasRole(minterRole, backendKYCWallet)).to.be
        .true;
    });
    it('burner role was granted to kyc admin at initialization', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      expect(await PolygonKYCToken.hasRole(burnerRole, kycAdmin)).to.be.true;
    });
  });
  describe('mint', function () {
    it('minter role can mint', async function () {
      const {
        PolygonKYCToken,
        minterRole,
        backendKYCWallet,
      } = await setupPolygonKYCToken();
      //
    });
    it('if not granted minter role cannot mint', async function () {
      const {
        PolygonKYCToken,
        minterRole,
        backendKYCWallet,
      } = await setupPolygonKYCToken();
      //
    });
    it('cannot mint to the same address twice', async function () {
      const {
        PolygonKYCToken,
        minterRole,
        backendKYCWallet,
      } = await setupPolygonKYCToken();
      //
    });
    it('can mint to the same address twice if the first token has been burned and balanceOf is zero', async function () {
      const {
        PolygonKYCToken,
        minterRole,
        backendKYCWallet,
      } = await setupPolygonKYCToken();
      //
    });
  });
  describe('burn', function () {
    it('a user can burn their own token', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('a user cannot burn a token belonging to another', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
  });
  describe('burnFrom', function () {
    it('burner role can burn a token belonging to another', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('if not burner role cannot burn a token belonging to another', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
  });
  describe('transfer', function () {
    it('mint emits Transfer event', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('burn emits Transfer event', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('burnFrom emits Transfer event', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('transferring own token fails because token is not transferable', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('transfer by approved operator fails because token is not transferable', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
  });
  describe('tokenURI', function () {
    it('base token uri was set at initialization', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('default admin role can set base token uri', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('if not granted default admin role cannot set base token uri', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
    it('cannot view token uri if token id does not exist', async function () {
      const {
        PolygonKYCToken,
        burnerRole,
        kycAdmin,
      } = await setupPolygonKYCToken();
      //
    });
  });
});
