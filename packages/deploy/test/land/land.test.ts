import {expect} from 'chai';
import {
  setupMainNetTest,
  setupMainNetV1Test,
  setupPolygonTest,
  setupPolygonV1Test,
} from './fixtures';

function commonTests(setupFunc) {
  it('admin', async function () {
    const {contract, namedAccount} = await setupFunc();
    // TODO: Check if this is ok on forks
    expect(await contract.getAdmin()).to.be.equal(namedAccount.deployer);
  });
  // TODO: minters, superOperator, operatorRegistry
  //  we can add some specifics to deploy_mocks to check the current state of live nets
}

// TODO: We need a way to skip some tests when running on l1 or L2
function mainNetTests(setupFunc) {
  it('meta transaction processor', async function () {
    const {contract, sand} = await setupFunc();
    expect(await contract.isMetaTransactionProcessor(sand)).to.be.true;
  });
}

// TODO: We need a way to skip some tests when running on l1 or L2
function polygonTests(setupFunc) {
  it('trusted forwarder', async function () {
    const {contract, trustedForwarder} = await setupFunc();
    expect(await contract.isTrustedForwarder(trustedForwarder)).to.be.true;
  });
}

/* eslint-disable mocha/no-setup-in-describe */
describe('Land', function () {
  describe('Mainnet Land', function () {
    commonTests(setupMainNetTest);
    mainNetTests(setupMainNetTest);
  });

  describe('Polygon Land', function () {
    commonTests(setupPolygonTest);
    polygonTests(setupPolygonTest);
  });

  describe('Mainnet Land V1', function () {
    commonTests(setupMainNetV1Test);
    mainNetTests(setupMainNetV1Test);
  });

  describe('Polygon Land V1', function () {
    commonTests(setupPolygonV1Test);
    polygonTests(setupPolygonV1Test);
  });
});
/* eslint-enable mocha/no-setup-in-describe */
