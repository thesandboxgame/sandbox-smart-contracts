/* eslint-disable class-methods-use-this, camelcase */

const Web3 = require('web3');

class MerkleTree {
    constructor(data) {
        const leaves = this.calculateLeaves(
            this.makeEvenElements(data),
        );

        this.levels = this.computeMerkleTree(leaves);
    }

    makeEvenElements(elements) {
        if (elements.length === 0) {
            throw new Error('No data was provided...');
        }

        const even = elements;

        if (even.length % 2 !== 0) {
            even.push(
                even[even.length - 1],
            );
        }

        return even;
    }

    calculateLeaves(data) {
        return data.map((d) => Web3.utils.soliditySha3(d));
    }

    calculateNewNode(left, right) {
        return Web3.utils.soliditySha3(left + right);
    }

    reduceNodes(nodes) {
        const reducedNodes = [];

        for (let i = 0; i < nodes.length; i += 2) {
            const node = this.calculateNewNode(nodes[i], nodes[i + 1]);

            reducedNodes.push(node);
        }

        return reducedNodes;
    }

    computeMerkleTree(leaves) {
        const levels = [];

        let reducer = leaves;

        while (reducer.length !== 1) {
            reducer = this.reduceNodes(reducer);
            levels.push(reducer);
        }

        return levels;
    }

    getRoot() {
        return this.levels[this.levels.length - 1][0];
    }

    getDepth() {
        return this.levels.length + 1;
    }
}

module.exports = MerkleTree;
