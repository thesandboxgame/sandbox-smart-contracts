# Land, a ERC721 contract designed for a 2d map

LAND is a smart contract token implementation of [EIP-721](https://eips.ethereum.org/EIPS/eip-721) (for non fungible, unique tokens) where each token represent a portion of Land on our 3d voxel world.

Each land is placed on a 2d plane composed of 408x408 = 166464 Land token.

The contract has been optimized to permit the creation and transfer of a relatively large amount of land at the same time. We use a quad tree representation to achieve that.

See [Land.sol](../old_src/Land.sol)

An Audit was performed by Certik : see [./audits/land_landsale_with_eth_certik_audit.pdf](./audits/land_landsale_with_eth_certik_audit.pdf)
