# Asset, a dual ERC1155 / ERC721 token for user generated content

ASSET is a smart contract token implementation of both [EIP-1155](https://eips.ethereum.org/EIPS/eip-1155) (for limited editions tokens) and [EIP-721](https://eips.ethereum.org/EIPS/eip-721) (for non fungible, unique tokens)

See [Asset.sol](../src/solc_0.5/Asset.sol)

Each token represents the creations of our players. It is a permission-less implementation of EIP-1155 and EIP-721 where every user can mint their own token represented via metadata.

It implements both EIP-1155 and EIP-721 so players’ creation lives in the same id space and can be treated equivalently by wallets or marketplaces that support both EIP

Since we are dealing with User Generated Content, we can expect all sorts of content to be minted on our Asset smart contract. We will have thus to filter them out.

It was impossible to do that on the smart contract itself since the contract can’t read the metadata and it would bring too much responsibility on us to use a signature scheme where we would have to approve every asset before minting.

Instead we use what we could call a “layer 2” solution where our community, or at least a part of it, the curators will be rewarded to filter assets that do not fit the community policies. These curators will put SAND at stake on a special smart contract.

Every time a creator submit a minting transaction on our Asset smart contract, it has to pay a SAND fee and make sure all the content of the metadata fits the community policy.

The Asset is then published on our website and curators can bet whether the Asset will be rejected by our policies. Our website can filter bad assets based on this information.

A set of moderators can then decide to give their judgement on whether an Asset should be filtered out or not. When doing so curators are rewarded or punished based on their bet.

Note though that moderators are unlikely to need to act often as the fear of losing bets should make sure both creators and curators ensure only good content is minted on our Asset smart contract.

This solution was inspired by vitalik’s post on https://ethresear.ch/t/prediction-markets-for-content-curation-daos/1312

An Audit was performed by Solidified : see [Audit_1](./audits/asset_solidified_audit.pdf) & [Audit_2](./audits/Audit%20Report%20-%20Sandbox%20Asset%20Bug%20Fix%20%5B15.01.2020%5D.pdf)
