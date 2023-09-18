import {ethers} from 'hardhat';
import {expect} from '../chai-setup';
import {deployAssetMatcher} from '../fixtures';
import {loadFixture} from '@nomicfoundation/hardhat-network-helpers';
import {SignerWithAddress} from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import {Contract} from 'ethers';

// const order = require('../../scripts/order.js');
const {id} = require('../helpers/assets');

const MOCK_ADDRESS_1 = '0x0000000000000000000000000000000000000001';

describe('AssetMatcher.sol', function () {
  let assetMatcher: Contract;
  let owner: SignerWithAddress;

  this.beforeAll(async function () {
    const {contract, deployer} = await loadFixture(deployAssetMatcher);
    assetMatcher = contract;
    owner = deployer;
  });

  it('setAssetMatcher should revert if msg sender is not owner', async function () {
    const [, user] = await ethers.getSigners();
    await expect(
      assetMatcher.connect(user).setAssetMatcher(id('BLA'), MOCK_ADDRESS_1)
    ).to.revertedWith('Ownable: caller is not the owner');
  });

  it('setAssetMatcher works', async function () {
    await expect(assetMatcher.setAssetMatcher(id('BLA'), MOCK_ADDRESS_1))
      .to.emit(assetMatcher, 'MatcherChange')
      .withArgs(id('BLA'), MOCK_ADDRESS_1);
  });

  // describe('ETH', function () {
  //   it('should extract ETH type if both are ETHs', async function () {
  //     const result = await testing.matchAssets(
  //       order.AssetType(ETH, '0x'),
  //       order.AssetType(ETH, '0x')
  //     );
  //     assert.equal(result[0], ETH);
  //   });
  //   it('should extract nothing if one is not ETH', async function () {
  //     const result = await testing.matchAssets(
  //       order.AssetType(ETH, '0x'),
  //       order.AssetType(ERC20, '0x')
  //     );
  //     assert.equal(result[0], 0);
  //   });
  // });

  //   describe('ERC20', function () {
  //     it('should extract ERC20 type if both are and addresses equal', async function () {
  //       const encoded = enc(accounts[5]);
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC20, encoded),
  //         order.AssetType(ERC20, encoded)
  //       );
  //       assert.equal(result[0], ERC20);
  //       assert.equal(result[1], encoded);
  //     });
  //     it("should extract nothing if erc20 don't match", async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC20, enc(accounts[1])),
  //         order.AssetType(ERC20, enc(accounts[2]))
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //     it('should extract nothing if other type is not ERC20', async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC20, enc(accounts[1])),
  //         order.AssetType(ETH, '0x')
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //   });
  //   describe('ERC721', function () {
  //     it('should extract ERC721 type if both are equal', async function () {
  //       const encoded = enc(accounts[5], 100);
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC721, encoded),
  //         order.AssetType(ERC721, encoded)
  //       );
  //       assert.equal(result[0], ERC721);
  //       assert.equal(result[1], encoded);
  //     });
  //     it("should extract nothing if tokenIds don't match", async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC721, enc(accounts[5], 100)),
  //         order.AssetType(ERC721, enc(accounts[5], 101))
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //     it("should extract nothing if addresses don't match", async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC721, enc(accounts[4], 100)),
  //         order.AssetType(ERC721, enc(accounts[5], 100))
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //     it('should extract nothing if other type is not ERC721', async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC721, enc(accounts[5], 100)),
  //         order.AssetType(ETH, '0x')
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //   });
  //   describe('ERC1155', function () {
  //     it('should extract ERC1155 type if both are equal', async function () {
  //       const encoded = enc(accounts[5], 100);
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC1155, encoded),
  //         order.AssetType(ERC1155, encoded)
  //       );
  //       assert.equal(result[0], ERC1155);
  //       assert.equal(result[1], encoded);
  //     });
  //     it("should extract nothing if tokenIds don't match", async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC1155, enc(accounts[5], 100)),
  //         order.AssetType(ERC1155, enc(accounts[5], 101))
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //     it("should extract nothing if addresses don't match", async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC1155, enc(accounts[4], 100)),
  //         order.AssetType(ERC1155, enc(accounts[5], 100))
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //     it('should extract nothing if other type is not erc1155', async function () {
  //       const encoded = enc(accounts[5], 100);
  //       const result = await testing.matchAssets(
  //         order.AssetType(ERC1155, encoded),
  //         order.AssetType(ERC721, encoded)
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //   });
  //   describe('BUNDLE', function () {
  //     it('should extract BUNDLE type if both are equal', async function () {
  //       const encoded = enc(accounts[5], 100);
  //       const result = await testing.matchAssets(
  //         order.AssetType(BUNDLE, encoded),
  //         order.AssetType(BUNDLE, encoded)
  //       );
  //       assert.equal(result[0], BUNDLE);
  //       assert.equal(result[1], encoded);
  //     });
  //     it("should extract nothing if tokenIds don't match", async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(BUNDLE, enc(accounts[5], 100)),
  //         order.AssetType(BUNDLE, enc(accounts[5], 101))
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //     it("should extract nothing if addresses don't match", async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType(BUNDLE, enc(accounts[4], 100)),
  //         order.AssetType(BUNDLE, enc(accounts[5], 100))
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //     it('should extract nothing if other type is not a BUNDLE', async function () {
  //       const encoded = enc(accounts[5], 100);
  //       const result = await testing.matchAssets(
  //         order.AssetType(BUNDLE, encoded),
  //         order.AssetType(ERC721, encoded)
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //   });
  //   describe('generic', function () {
  //     it('should extract left type if asset types are equal', async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType('0x00112233', '0x1122'),
  //         order.AssetType('0x00112233', '0x1122')
  //       );
  //       assert.equal(result[0], '0x00112233');
  //       assert.equal(result[1], '0x1122');
  //     });
  //     it('should extract nothing single byte differs', async function () {
  //       const result = await testing.matchAssets(
  //         order.AssetType('0x00112233', '0x1122'),
  //         order.AssetType('0x00112233', '0x1111')
  //       );
  //       assert.equal(result[0], 0);
  //     });
  //   });
});
