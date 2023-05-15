# Asset Contract

Main contract for User Generated Content (UGC).

The minting of assets happens through a different contract called Asset Minter, only the bridge contract will be allowed to directly call mint on this contract.

## Roles

- `DEFAULT_ADMIN_ROLE` - the role that is required to grant roles to other addresses
- `MINTER_ROLE` - the role that is required to mint assets
- `URI_SETTER_ROLE` - the role that is required to set the base uri for the assets
- `BRIDGE_MINER_ROLE` - the role that is required to mint assets that were bridged from L1 to L2

## Public Variables

- `recyclingAmounts` - mapping of amount of copies that are required to be burned to receive a catalyst of a given tier
- `creatorNonces` - mapping of an address of the creator to a numeric value representing the amount of different assets created by a particular creator. This mapping also ensures the tokenId uniqueness for assets created by the same creator.
- `bridgedTokensNonces` - mapping of L1 tokenId to a numeric value which is used to make sure that all copies of a given L1 tokenId that are being bridged receive same tokenId on the new network

## External functions

```solidity
   function initialize(
        string memory uri,
        address forwarder,
        address minter,
        address uriSetter,
        uint256[] calldata catalystTiers,
        uint256[] calldata catalystRecycleCopiesNeeded
    ) external initializer
```

Initializes the contract with the given parameters at the time of deployment

- `uri` - the base uri for the assets
- `forwarder` - the forwarder contract address
- `minter` - the address of the Asset Minter contract
- `uriSetter` - the address of the URI setter wallet
- `catalystTiers` - array of available catalyst tiers
- `catalystRecycleCopiesNeeded` - array of required copies to be burned to receive a catalyst of a given tier

---

```solidity
      function mint(
        address creator,
        uint256 amount,
        uint8 tier,
        bool isNFT,
        bytes memory data
    ) external
```

Mints a new asset, only the Asset Minter contract is allowed to call this function
This function will increment the creatorNonces mapping for the creator of the asset

This function should not be used to mint TSB exclusive assets

- `creator` - the address of the creator of the asset
- `amount` - the amount of copies to mint
- `tier` - the tier of the catalyst used
- `isNFT` - whether the asset is an NFT or not
- `data` - data to be passed on

---

```solidity
    function mintSpecial(
        address creator,
        address recipient,
        uint256 amount,
        uint8 tier,
        bool revealed,
        bool isNFT,
        bytes memory data
    ) external
```

Mint special is an administrative function that allows specifying more parameters than the regular mint function.
This function will increment the creatorNonces mapping for the creator of the asset.

This function is used to mint TSB exclusive assets

---

```solidity
    function bridgeMint(
        address originalCreator,
        uint256 originalTokenId,
        uint256 amount,
        uint8 tier,
        address recipient,
        bool revealed,
        bool isNFT,
        bytes memory data
    ) external
```

Special function for the bridge contract to mint assets that were bridged from L1 to L2.
This function will increment the creatorNonces mapping for the creator of the asset.

- `originalCreator` - the address of the creator of the asset on L1
- `originalTokenId` - the tokenId of the asset on L1
- `amount` - the amount of copies to mint
- `tier` - the tier of the catalyst that the new asset will have
- `recipient` - the address of the recipient of the asset
- `revealed` - whether the asset is revealed or not
- `isNFT` - whether the asset is an NFT or not
- `data` - data to be passed on

---

```solidity
    mintBatch(
        address creator,
        uint256[] calldata amounts,
        uint8[] calldata tiers,
        bool[] calldata isNFT,
        bytes calldata data
    ) external
```

Mints a batch of assets, only the Asset Minter contract is allowed to call this function

- `creator` - the address of the creator of the asset
- `amounts` - the amount of copies to mint for each asset
- `tiers` - the tier of the catalyst used for each asset
- `isNFT` - whether the asset is an NFT or not for each asset
- `data` - data to be passed on

---

```solidity
    function reveal(
        address creator,
        uint8 tier,
        uint256 tokenId,
        uint256 amount
    ) external
```

TODO WORK IN PROGRESS

---

```solidity
    function recycleAssets(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    ) external
```

This function accepts tokenIds and amounts that share the same catalyst tier and burns them to receive a catalysts of the given tier.
The sum of call amounts must return zero from a modulo operation with the recyclingAmounts[catalystTier] value.

- `tokenIds` - array of tokenIds to burn
- `amounts` - array of amounts to burn
- `catalystTier` - the tier of the catalyst to receive

---

```solidity
    function burnFrom(
        address account,
        uint256 id,
        uint256 amount
    ) external
```

Burns a given amount of copies of an asset from a given address.

- `account` - the address of the owner of the asset
- `id` - the tokenId of the asset
- `amount` - the amount of copies to burn

---

```solidity
    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external
```

Burns a batch of assets from a given address.

- `account` - the address of the owner of the asset
- `ids` - the tokenIds of the assets
- `amounts` - the amounts of copies to burn

---

```solidity
    function setRecyclingAmount(
        uint256 catalystTokenId,
        uint256 amount
    ) external
```

Sets the amount of copies that are required to be burned to receive a catalyst of a given tier.

- `catalystTokenId` - the tokenId of the catalyst
- `amount` - the amount of copies to burn

---

```solidity
    function setURI(string memory newuri) external
```

Sets the base uri for the assets.

- `newuri` - the new base uri

---

```solidity
    function setURISetter(address newUriSetter) external
```

## Public functions

```solidity
    function generateTokenId(
        address creator,
        uint8 tier,
        uint16 assetNonce,
        bool mintAsRevealed,
        bool isNFT
    ) public view returns (uint256)
```

Generates a tokenId for a given asset.
Uses 256 bits to store the tokenId, the first 160 bits are used to store the address of the creator, the next 8 bits are used to store the catalyst tier, the next 16 bits are used to store the asset nonce, the next 1 bit is used to store whether the asset is revealed or not, the next 1 bit is used to store whether the asset is an NFT or not.

- `creator` - the address of the creator of the asset
- `tier` - the tier of the catalyst used
- `assetNonce` - the nonce of the asset
- `mintAsRevealed` - whether the asset is revealed or not
- `isNFT` - whether the asset is an NFT or not

---

```solidity
    function extractCreatorFromId(
        uint256 tokenId
    ) public pure returns (address creator)
```

Extracts the creator address from a given tokenId.

- `tokenId` - the tokenId to extract the creator address from

---

```solidity
    function extractTierFromId(
        uint256 tokenId
    ) public pure returns (uint8 tier)
```

Extracts the catalyst tier from a given tokenId.

- `tokenId` - the tokenId to extract the catalyst tier from

---

```solidity
    function extractIsRevealedFromId(
        uint256 tokenId
    ) public pure returns (uint16 assetNonce)
```

Extracts whether the asset is revealed or not from a given tokenId.

- `tokenId` - the tokenId to extract the revealed status from

---

```solidity
    function extractCreatorNonceFromId(
        uint256 tokenId
    ) public pure returns (uint16 assetNonce)
```

Extracts the creator nonce from a given tokenId.

- `tokenId` - the tokenId to extract the asset nonce from

---

```solidity
    function extractIsNFTFromId(
        uint256 tokenId
    ) public pure returns (uint16 assetNonce)
```

Extracts whether the asset is an NFT or not from a given tokenId.

- `tokenId` - the tokenId to extract the NFT status from

---

```solidity
    function getRecyclingAmount(
        uint256 catalystTokenId
    ) public view returns (uint256)
```

Returns the amount of copies that are required to be burned to receive a catalyst of a given tier.

- `catalystTokenId` - the tokenId of the catalyst
