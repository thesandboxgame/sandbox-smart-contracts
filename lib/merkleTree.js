const ethers = require("ethers");
const {BigNumber} = ethers;
const {solidityKeccak256} = ethers.utils;

class MerkleTree {
  constructor(data) {
    this.leavesByHash = {};
    this.leaves = this.buildLeaves(data);
    for (const leaf of this.leaves) {
      this.leavesByHash[leaf.hash] = leaf;
    }
    this.root = this.computeMerkleTree(this.leaves);
  }

  /**
   * @description Modifies the array in place to ensure even numbers by duplicating last element if necessary
   * @param {array} elements An array
   * @returns {array} A new array
   */
  makeEvenElements(elements) {
    if (elements.length === 0) {
      throw new Error("No data was provided...");
    }

    const even = elements;

    if (even.length % 2 !== 0) {
      even.push(even[even.length - 1]);
    }

    return even;
  }

  /**
   * @description Sorts an array (ascending order)
   * @param {array} arrayToSort The array to sort
   * @returns {array} The sorted array
   */
  sort(arrayToSort) {
    const sortedArray = [...arrayToSort];
    return sortedArray.sort((a, b) => (BigNumber.from(a.hash).gt(b.hash) ? 1 : -1));
  }

  /**
   * @description Builds the leaves of a Merkle tree
   * @param {array} data An array of data
   * @returns {array} The leaves of the Merkle tree (as an even and sorted array)
   */
  buildLeaves(data) {
    const leaves = this.makeEvenElements(data).map((leaf) => {
      return {hash: leaf};
    });
    return this.sort(leaves);
  }

  /**
   * @description Calculates a new node from 2 values
   * @param {string} left The left parameter for the new node
   * @param {string} right The right parameter for the new node
   * @returns {string} The new node (hash)
   */
  calculateParentNode(left, right) {
    let hash;
    // If a node doesn't have a sibling, it will be hashed with itself
    if (left === undefined || right === undefined) {
      hash = solidityKeccak256(
        ["bytes32", "bytes32"],
        [right ? right.hash : left.hash, right ? right.hash : left.hash]
      );
    } else {
      hash = solidityKeccak256(["bytes32", "bytes32"], [left.hash, right.hash]);
    }

    const parent = {
      hash,
      left,
      right,
    };
    if (left) {
      left.parent = parent;
    }
    if (right) {
      right.parent = parent;
    }
    return parent;
  }

  /**
   * @description Calculates the parent nodes from an array of nodes
   * @param {array} nodes The current nodes
   * @returns {array} The parent nodes
   */
  createParentNodes(nodes) {
    const parentsNodes = [];

    for (let i = 0; i < nodes.length; i += 2) {
      if (!nodes[i] && !nodes[i + 1]) {
        throw new Error("both undefined");
      }
      const node = this.calculateParentNode(nodes[i], nodes[i + 1]);
      parentsNodes.push(node);
    }

    return parentsNodes;
  }

  /**
   * @description Computes a merkle tree
   * @param {array} leaves The initial leaves of the tree
   * @returns {object} A merkle tree
   */
  computeMerkleTree(leaves) {
    let nodes = leaves;

    while (nodes.length > 1) {
      nodes = this.createParentNodes(nodes);
      nodes = this.sort(nodes);
    }

    return nodes[0];
  }

  /**
   * @description Returns the leaves of the merkle tree
   * @returns {array} The leaves as an array
   */
  getLeaves() {
    return this.leaves;
  }

  /**
   * @description Returns the root of the merkle tree
   * @returns {string} The root as an string (hash)
   */
  getRoot() {
    return this.root;
  }

  /**
   * @description Returns the proof of a specific leaf
   * @param {string} leafHash The leaf to be proven
   * @returns {array} The array of proofs for the leaf
   */
  getProof(leafHash) {
    let leaf = this.leavesByHash[leafHash];

    const path = [];
    while (leaf.parent) {
      if (leaf.parent.left === leaf) {
        path.push(leaf.parent.right ? leaf.parent.right.hash : leaf.parent.left.hash);
      } else {
        path.push(leaf.parent.left ? leaf.parent.left.hash : leaf.parent.right.hash);
      }
      leaf = leaf.parent;
    }

    return path;
  }

  /**
   * @description Checks if a leaf is valid
   * @param {*} leaf The leaf to check
   * @param {*} proof The proof to validate the leaf
   * @returns {boolean} True if the lead if valid
   */
  isDataValid(leaf, proof) {
    let potentialRoot = leaf;
    for (let i = 0; i < proof.length; i += 1) {
      if (BigNumber.from(potentialRoot).lt(proof[i])) {
        potentialRoot = solidityKeccak256(["bytes32", "bytes32"], [potentialRoot, proof[i]]);
      } else {
        potentialRoot = solidityKeccak256(["bytes32", "bytes32"], [proof[i], potentialRoot]);
      }
    }

    return this.getRoot().hash === potentialRoot;
  }
}

module.exports = MerkleTree;
