const fs = require('fs');
const path = require('path');
const rocketh = require('rocketh');

const MerkleTree = require('../lib/merkleTree');
const {createDataArray, calculateLandHash, saltLands} = require('../lib/merkleTreeHelper');

const deployment = rocketh.deployment('LandPreSale_1');
const lands = deployment.data;
const secret = fs.readFileSync('./.land_presale_1_secret');
const saltedLands = saltLands(lands, secret);
const landHashArray = createDataArray(saltedLands);
const tree = new MerkleTree(landHashArray);

const landsWithProof = [];
for (const land of saltedLands) {
    land.proof = tree.getProof(calculateLandHash(land));
    landsWithProof.push(land);
}

fs.writeFileSync('./.land_presale_proofs.json', JSON.stringify(landsWithProof, null, '  '));
