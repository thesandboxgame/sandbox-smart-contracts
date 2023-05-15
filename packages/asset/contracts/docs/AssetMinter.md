# Asset Minter

This contract is used to mint assets.
It is a user facing contract, and is the only contract that can mint assets apart from the brige.

## Roles

- `DEFAULT_ADMIN_ROLE` - the role that is required to grant roles to other addresses
- `EXCLUSIVE_MINTER_ROLE` - role reserved for TSB admins to mint exclusive assets

## Public Variables

- `bannedCreators` - mapping of an address of the creator to a boolean value representing whether the creator is banned or not
- `voxelCreators` - mapping of an voxel model hash to an address of the creator

## External functions

```solidity
    function initialize(
        address _forwarder,
        address _assetContract,
        address _catalystContract,
        address _exclusiveMinter
    ) external initializer
```

Initializes the contract with the given parameters at the time of deployment

- `_forwarder` - the forwarder contract address
- `_assetContract` - the address of the Asset contract
- `_catalystContract` - the address of the Catalyst contract
- `_exclusiveMinter` - the address of the exclusive minter

---

```solidity
    function mintAsset(
        uint256 amount,
        uint256 voxelHash,
        uint8 tier,
        bool isNFT,
        bytes memory data
    ) external
```

Mints a new asset, any person can call this function.
Allows creators to mint any number of copies that is bigger than zero.
Creators can mint item as an NFT.

The first time a voxel model hash is used, the creator of the asset will be set as the owner of the voxel model.
That prevents the same voxel model from being used by different creators.

Minting an asset requires catalysts of selected tier to be burned with an amount matching the amount of copies being minted.

- `amount` - the amount of copies to mint and catalysts to burn
- `voxelHash` - the hash of the voxel model
- `tier` - the tier of the catalyst
- `isNFT` - whether the asset is an NFT or not
- `data` - data to be passed on

---

```solidity
    function mintAssetBatch(
        uint256[] calldata amounts,
        uint8[] calldata tiers,
        uint256[] calldata voxelHashes,
        bool[] calldata isNFT,
        bytes memory data
    ) external
```

Mints a batch of new assets, any person can call this function.
Allows creators to mint any number of copies that is bigger than zero.
Creators can mint items as an NFTs.

The first time a voxel model hash is used, the creator of the asset will be set as the owner of the voxel model.
That prevents the same voxel model from being used by different creators.

Minting an asset requires catalysts of selected tiers to be burned with an amount matching the amount of copies being minted.

All arrays passed to the smart contract must have the same length and the elements at the same index represent the same asset.

- `amounts` - an array of amount of copies to mint and catalysts to burn
- `tiers` - an array of tiers of the catalyst
- `voxelHashes` - an array of hashes of the voxel models
- `isNFT` - an array of booleans representing whether the asset is an NFT or not
- `data` - data to be passed on

---

```solidity
    function mintExclusive(
        address creator,
        address recipient,
        uint256 amount,
        uint8 tier,
        bool isNFT,
        bytes memory data
    ) external
```

Mints a new exclusive asset, only the exclusive minter can call this function.
Does not require burning catalysts.
Allows the specify who should be the recipient of the asset.

This function allows admins to mint assets for creators that are not allowed to mint assets themselves.
Admins can also mint assets of any tier without burning catalysts.

- `creator` - the address of the creator of the asset
- `recipient` - the address of the recipient of the asset
- `amount` - the amount of copies to mint
- `tier` - the tier of the catalyst
- `isNFT` - whether the asset is an NFT or not

---

```solidity
    function recycleAssets(
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    ) external
```

Burns assets of the same tier and mints a catalyst according to recycle rate.
The sum of the ammounts must be a multiplication of the recycle rate.
For example if 5 assets are required to be burned to receive a catalyst of tier 4 then the sum of the amounts must be 5, 10, 15, 20, etc.

- `tokenIds` - an array of token ids of the assets to burn
- `amounts` - an array of amounts of the assets to burn
- `catalystTier` - the tier of the catalyst to mint

---

```solidity
    function changeCatalystContractAddress(
        address _catalystContract
    ) external
```

Changes the address of the catalyst contract.
Only the default admin can call this function.

- `_catalystContract` - the address of the new catalyst contract

---

```solidity
    function changeAssetContractAddress(
        address _catalystContract
    ) external
```

Changes the address of the asset contract.
Only the default admin can call this function.

- `_assetContract` - the address of the new asset contract
