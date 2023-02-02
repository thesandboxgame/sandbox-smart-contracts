# OperatorFiltererRegistrant  

The OperatorFiltererRegistrant contract is made to be registered on the OperatorFilterRegistry and copy the default blacklist of the openSea. This contract would then be subscribed by the contract such as AssetERC721 and AssetERC1155.

# Requirement 

The OperatorFiltererRegistrant would be the subscription for our token contracts on a layer, such that when a address is added or removed from OperatorFiltererRegistrant's blacklist it would be come in affect for each contact which subscribe to the OperatorFiltererRegistrant's blacklist.