import {assert} from '../chai-setup';

import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayClaimableLands} = helpers;

describe('MerkleTree_assets', function () {
  it('should validate the data', async function () {
    const lands = [
      {
        reservedAddress: '0xfB56eb456045e22c9e78C560E9572801b011e8Eb',
        ids: [0, 1, 2],
      },
      {
        reservedAddress: '0xfB56eb456045e22c9e78C560E9572801b011e8Eb',
        ids: [3, 4, 5],
      },
      {
        reservedAddress: '0xfB56eb456045e22c9e78C560E9572801b011e8Eb',
        ids: [6, 7, 8],
      },
    ];

    const data = createDataArrayClaimableLands(
      lands,
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
