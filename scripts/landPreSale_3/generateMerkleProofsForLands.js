const fs = require('fs');
const rocketh = require('rocketh');

const MerkleTree = require('../../lib/merkleTree');
const {createDataArray, calculateLandHash, saltLands} = require('../../lib/merkleTreeHelper');

const deployment = rocketh.deployment('LandPreSale_3');
const lands = deployment.data;
const secretPath = process.argv[2];
if (!secretPath) {
    throw new Error('no secret provided');
}
const secret = fs.readFileSync(secretPath);
const saltedLands = saltLands(lands, secret);
const landHashArray = createDataArray(saltedLands);
const tree = new MerkleTree(landHashArray);

const landsWithProof = [];
for (const land of saltedLands) {
    land.proof = tree.getProof(calculateLandHash(land));
    landsWithProof.push(land);
}

fs.writeFileSync('./.presale_3_proofs.json', JSON.stringify(landsWithProof, null, '  '));
