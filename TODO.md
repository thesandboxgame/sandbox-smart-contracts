[] research different auction mechanism // separate auction mechanism / price changes in a different smart contract // allow seller to define it per sell ?

Auctions :
[] throwing whne get data is invalid ? for example call getAuction when no Auction in progress
[] multiple Auction contract (one for BOX one for Asset) or one generic
[] use signed message scheme to allow creationg of Auction in one tx => ERC721 extensions
[] Auction events : add seller
[] Auction events defined indexed values
[] getCurrentPrice behavior when auction is not running. return zero? return current values?
[] how to enforce cuts while allowing Auctions to be created independetly of the ERC721

[] Favor pull transactions instead of sending or tranferring directly at least for creator (could be malicius)
[] Multi auction let user cancel an X amount of the token

erc1155erc721
[] do not use balance for nft
[] mintMultiple support NFT
[] mintMultiple support n > 8