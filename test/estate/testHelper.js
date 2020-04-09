const assert = require('assert');
const {
    zeroAddress,
    emptyBytes,
} = require('../utils');
function EstateTestHelper(contracts) {
    this.contracts = contracts;
}
EstateTestHelper.selectQuads = function (landQuads, indices) {
    const xs = [];
    const ys = [];
    const sizes = [];
    const selection = [];
    if (!indices) {
        indices = [];
        for (let i = 0; i < landQuads.length; i++) {
            indices.push(i);
        }
    }
    for (const index of indices) {
        const landQuad = landQuads[index];
        xs.push(landQuad.x);
        ys.push(landQuad.y);
        sizes.push(landQuad.size);
        selection.push(landQuad);
    }
    return {xs, ys, sizes, selection};
};

EstateTestHelper.assignIds = function (landQuads) {
    for (const landQuad of landQuads) {
        landQuad.topCornerId = landQuad.x + (landQuad.y * 408);
    }
    return landQuads;
};

EstateTestHelper.prototype.mintQuads = async function (to, landSpecs) {
    const contracts = this.contracts;
    for (const landSpec of landSpecs) {
        await contracts.LandFromMinter.functions.mintQuad(to, landSpec.size, landSpec.x, landSpec.y, emptyBytes).then((tx) => tx.wait());
    }
};

EstateTestHelper.prototype.mintQuadsAndCreateEstate = async function (map, to) {
    const contracts = this.contracts;
    const landQuads = EstateTestHelper.assignIds(map.quads, map.selection);
    await this.mintQuads(to, landQuads);
    const {xs, ys, sizes, selection} = EstateTestHelper.selectQuads(landQuads, map.selection);
    await contracts.Estate.connect(contracts.Estate.provider.getSigner(to)).functions.createFromMultipleQuads(to, to, sizes, xs, ys, map.junctions).then((tx) => tx.wait());
    return {selection};
};

EstateTestHelper.prototype.checkLandOwnership = async function (selection, expectedOwner) {
    for (const landQuad of selection) {
        for (let sx = 0; sx < landQuad.size; sx++) {
            for (let sy = 0; sy < landQuad.size; sy++) {
                const id = landQuad.x + sx + ((landQuad.y + sy) * 408);
                const landOwner = await this.contracts.Land.callStatic.ownerOf(id);
                assert.equal(landOwner, expectedOwner);
            }
        }
    }
};

module.exports = EstateTestHelper;