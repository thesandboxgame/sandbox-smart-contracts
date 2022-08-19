import {ethers, getUnnamedAccounts} from 'hardhat';
import {withSnapshot, setupUser, waitFor, expectEventWithArgs} from '../utils';
import {BigNumber} from 'ethers';
import {depositViaChildChainManager} from '../polygon/sand/fixtures';

export const setupLease = withSnapshot(
  [
    'PolygonSand',
    'PolygonLand',
    'PolygonAssetERC1155',
    'MockLandWithMint',
    'PolygonLease',
  ],
  async function () {
    // const {} = await getNamedAccounts();
    const unnamedAccounts = await getUnnamedAccounts();

    const PolygonSand = await ethers.getContract('PolygonSand');
    const PolygonLease = await ethers.getContract('PolygonLease');
    const PolygonAsset = await ethers.getContract('PolygonAssetERC1155');
    const MockLandWithMint = await ethers.getContract('MockLandWithMint');

    const owner = await setupUser(unnamedAccounts[1], {
      PolygonLease,
      PolygonSand,
      PolygonAsset,
      MockLandWithMint,
    });

    // Give owner a MockLand
    const receipt = await waitFor(
      owner.MockLandWithMint.mintQuad(owner.address, 1, 1, 1, '0x3333')
    );

    // Get token ID
    const transferEvent = await expectEventWithArgs(
      MockLandWithMint,
      receipt,
      'Transfer'
    );
    const tokenId = transferEvent.args[2];

    // Give owner some SAND. Note: the only way to deposit PolygonSand in L2 is via the childChainManager
    const childChainManager = await ethers.getContract('CHILD_CHAIN_MANAGER');
    const sandAmount = BigNumber.from(100000).mul('1000000000000000000');
    await depositViaChildChainManager(
      {sand: PolygonSand, childChainManager},
      owner.address,
      sandAmount
    );

    const trustedForwarder = await ethers.getContract('TRUSTED_FORWARDER_V2');

    return {
      PolygonLease,
      trustedForwarder,
      owner,
      MockLandWithMint,
      PolygonSand,
      PolygonAsset,
      tokenId,
    };
  }
);
