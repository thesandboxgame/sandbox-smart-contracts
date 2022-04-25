//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./AssetBaseERC1155.sol";

// solhint-disable-next-line no-empty-blocks
contract AssetERC1155 is AssetBaseERC1155 {
    uint256 private constant CHAIN_INDEX_OFFSET_MULTIPLIER = uint256(2)**(256 - 160 - 1 - 32);

    event PredicateSet(address predicate);

    function initialize(
        address trustedForwarder,
        address admin,
        address bouncerAdmin,
        IAssetERC721 assetERC721,
        uint8 chainIndex
    ) external {
        init(trustedForwarder, admin, bouncerAdmin, assetERC721, chainIndex);
    }

    /// @notice Mint a token type for `creator` on slot `packId`.
    /// @dev Function implementation reserved for future use cases on L1.
    /// @dev For this function it is not required to provide data.
    /// @param creator address of the creator of the token.
    /// @param packId unique packId for that token.
    /// @param hash hash of an IPFS cidv1 folder that contains the metadata of the token type in the file 0.json.
    /// @param supply number of tokens minted for that token type.
    /// @param owner address that will receive the tokens.
    /// @param data extra data to accompany the minting call.
    /// @return id the id of the newly minted token type.
    function mint(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256 supply,
        address owner,
        bytes calldata data
    ) external returns (uint256 id) {
        require(hash != 0, "HASH==0");
        require(isBouncer(_msgSender()), "!BOUNCER");
        require(owner != address(0), "TO==0");
        id = _generateTokenId(creator, supply, packId, supply == 1 ? 0 : 1, 0);
        uint256 uriId = id & ERC1155ERC721Helper.URI_ID;
        require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
        _metadataHash[uriId] = hash;
        _mint(_msgSender(), owner, id, supply, data);
    }

    /// @notice Creates `amount` tokens of token type `id`, and assigns them to `account`.
    /// @dev Should be callable only by AssetERC1155Tunnel.
    /// @dev Encoded bytes32 metadata hash must be provided as data.
    /// Make sure minting is done only by this function.
    /// @param account user address for whom token is being minted.
    /// @param id token which is being minted.
    /// @param amount amount of token being minted.
    /// @param data token metadata.
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external {
        require(_msgSender() == _predicate, "!PREDICATE");
        require(data.length > 0, "METADATA_MISSING");
        uint256 uriId = id & ERC1155ERC721Helper.URI_ID;
        require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
        _metadataHash[uriId] = abi.decode(data, (bytes32));
        _mint(_msgSender(), account, id, amount, data); // TODO: check add account does not equal 0 ?
    }

    /// @notice Creates `amounts` tokens of token types `ids`, and assigns them to `account`.
    /// @dev Should be callable only by AssetERC1155Tunnel.
    /// @dev Encoded bytes32[] metadata hashes must be provided as data.
    /// @param to address to mint to.
    /// @param ids ids to mint.
    /// @param amounts supply for each token type.
    /// @param data token metadata.
    function mintMultiple(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external {
        require(_msgSender() == _predicate, "!PREDICATE");
        require(data.length > 0, "METADATA_MISSING");
        bytes32[] memory hashes = abi.decode(data, (bytes32[]));
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 uriId = ids[i] & ERC1155ERC721Helper.URI_ID;
            require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
            _metadataHash[uriId] = hashes[i];
        }
        _mintBatch(to, ids, amounts, data);
    }

    /// @notice Set the address that will be able to mint on L1 (limited to custom predicate).
    /// @param predicate address that will be given minting rights for L1.
    function setPredicate(address predicate) external {
        require(_msgSender() == _admin, "!ADMIN");
        _predicate = predicate;
        emit PredicateSet(predicate);
    }

    // TODO: check and update comments
    function _generateTokenId(
        address creator,
        uint256 supply,
        uint40 packId,
        uint16 numFTs,
        uint16 packIndex
    ) internal view returns (uint256) {
        require(supply > 0 && supply <= ERC1155ERC721Helper.MAX_SUPPLY, "SUPPLY_OUT_OF_BOUNDS");
        return
            uint256(uint160(creator)) *
            ERC1155ERC721Helper.CREATOR_OFFSET_MULTIPLIER + // CREATOR
            (supply == 1 ? uint256(1) * ERC1155ERC721Helper.IS_NFT_OFFSET_MULTIPLIER : 0) + // minted as NFT(1)|FT(0) // ERC1155ERC721Helper.IS_NFT
            uint256(_chainIndex) *
            CHAIN_INDEX_OFFSET_MULTIPLIER + // mainnet = 0, polygon = 1
            uint256(packId) *
            ERC1155ERC721Helper.PACK_ID_OFFSET_MULTIPLIER + // packId (unique pack) // ERC1155ERC721Helper.URI_ID
            numFTs *
            ERC1155ERC721Helper.PACK_NUM_FT_TYPES_OFFSET_MULTIPLIER + // number of fungible token in the pack // ERC1155ERC721Helper.URI_ID
            packIndex; // packIndex (position in the pack) // PACK_INDEX
    }
}
