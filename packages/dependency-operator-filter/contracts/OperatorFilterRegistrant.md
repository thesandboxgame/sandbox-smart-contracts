# OperatorFilterRegistry 
Opensea in an attempt to regularize market places and creator earnings deployed a registry(https://github.com/ProjectOpenSea/operator-filter-registry) and asked NFT token contract to add filter logic(https://github.com/ProjectOpenSea/operator-filter-registry/blob/main/src/OperatorFilterer.sol). 

These filter has two modifier 
1st : onlyAllowedOperator 
2nd : onlyAllowedOperatorApproval

These modifiers are added to to the transfer functions(onlyAllowedOperator) and approval function(onlyAllowedOperatorApproval) such that the when not an owner tried to transfer a Token(ex: Marketplace) or owner approves an operator(ex : Marketplace) they would be filtered on the OperatorFilterRegistry. 

If the operator or the token transfer is not approved by the registry the transaction would be reverted.

On OperatorFilterRegistry a contract owner or the contract can register and maintain there own blacklist or subscribe to other blacklists but that blacklist should contain the default marketplaces blacklisted by Opensea. 

# OperatorFiltererRegistrant  

The OperatorFiltererRegistrant contract is made to be registered on the OperatorFilterRegistry and copy the default blacklist of the openSea. This contract would then be subscribed by the contract such as AssetERC721 and AssetERC1155.

The OperatorFiltererRegistrant would be the subscription for our token contracts on a layer(layer-1 : Ethereum , layer-2: Polygon), such that when a address is added or removed from OperatorFiltererRegistrant's blacklist it would be come in affect for each contact which subscribe to the OperatorFiltererRegistrant's blacklist.

# Intended usage

The OperatorFiltererRegistrant is so that sandbox will have a common blacklist that would be utilized by every Token contract on a layer. This would create a single list that would be subscribed by each contract to provide uniformity to which market places sandbox wants to blacklist. This would also provide a focal point to remove and add market places such that it would be applicable to every contract that subscribe to it.

# Implementation 

We didn't use the npm package as its solidity pragma(solidity version) doesn't match the one we have for our Asset contracts and updating our solidity version for Assets would have been to time consuming.

You won't find OperatorFilterRegistrant in the npm package as this contract is our implementation.
