import {assert} from '../chai-setup';

import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayClaimableAssetsAndLands} = helpers;

describe('MerkleTree_multi', function () {
  it('should validate the data', async function () {
    const claims = [
      {
        reservedAddress: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
        assetIds: [0, 1, 2],
        assetValues: [5, 5, 5],
        landIds: [0, 1, 2, 3, 4, 5],
      },
      {
        reservedAddress: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
        assetIds: [3],
        assetValues: [1],
        landIds: [6],
      },
      {
        reservedAddress: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
        landIds: [7],
      },
      {
        reservedAddress: '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
        assetIds: [4, 5, 6],
        assetValues: [5, 5, 5],
      },
    ];

    const data = createDataArrayClaimableAssetsAndLands(
      claims,
      '0x4467363716526536000005451427798982881775318563547751090997863683'
    );
    const tree = new MerkleTree(data);

    for (let i = 0; i < data.length; i += 1) {
      const d = data[i];
      const proof = tree.getProof(d);
      const isValid = tree.isDataValid(d, proof);

      if (!isValid) {
        console.log('leaf to verify:', d);
        console.log(
          'Root:',
          JSON.stringify(tree.getRoot(), ['left', 'right', 'hash'], '  ')
        );
        console.log('Proof:', proof);
      }

      assert.equal(isValid, true, 'Data should be valid');
    }
  });
});
