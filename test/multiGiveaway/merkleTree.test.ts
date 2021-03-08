import {assert} from '../chai-setup';

import MerkleTree from '../../lib/merkleTree';
import helpers from '../../lib/merkleTreeHelper';
const {createDataArrayMultiClaim} = helpers;
import {default as testData} from '../../data/giveaways/multi_giveaway_1/claims_0_hardhat.json';

describe('MerkleTree_multi', function () {
  it('should validate the data', async function () {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claims: any = testData;
    const data = createDataArrayMultiClaim(
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
