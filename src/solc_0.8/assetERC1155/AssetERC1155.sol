//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./AssetBaseERC1155.sol";

// solhint-disable-next-line no-empty-blocks
contract AssetERC1155 is AssetBaseERC1155 {
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
        require(account != address(0), "TO==0");
        uint256 uriId = id & ERC1155ERC721Helper.URI_ID;
        require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
        _metadataHash[uriId] = abi.decode(data, (bytes32));
        _mint(_msgSender(), account, id, amount, data);
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
        require(ids.length == amounts.length, "AssetERC1155: ids and amounts length mismatch");
        require(_msgSender() == _predicate, "!PREDICATE");
        require(data.length > 0, "METADATA_MISSING");
        require(to != address(0), "TO==0");
        bytes32[] memory hashes = abi.decode(data, (bytes32[]));
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 uriId = ids[i] & ERC1155ERC721Helper.URI_ID;
            require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
            _metadataHash[uriId] = hashes[i];
        }
        _mintBatches(to, ids, amounts, data);
    }

    /// @notice function to be called by tunnel to mint deficit of minted tokens
    /// @dev This mint calls for add instead of replace in packedTokenBalance
    /// @param account address of the ownerof tokens.
    /// @param id id of the token to be minted.
    /// @param amount quantity of the token to be minted.
    function mintDeficit(
        address account,
        uint256 id,
        uint256 amount
    ) external {
        require(_msgSender() == _predicate, "!PREDICATE");
        _mintDeficit(account, id, amount);
    }

    /// @notice Set the address that will be able to mint on L1 (limited to custom predicate).
    /// @param predicate address that will be given minting rights for L1.
    function setPredicate(address predicate) external {
        require(_msgSender() == _admin, "!ADMIN");
        _predicate = predicate;
        emit PredicateSet(predicate);
    }

    /// @notice Burns `amount` tokens of type `id`.
    /// @param id token type which will be burnt.
    /// @param amount amount of token to burn.
    function burn(uint256 id, uint256 amount) external {
        _burn(_msgSender(), id, amount);
    }

    /// @notice Burns `amount` tokens of type `id` from `from`.
    /// @param from address whose token is to be burnt.
    /// @param id token type which will be burnt.
    /// @param amount amount of token to burn.
    function burnFrom(
        address from,
        uint256 id,
        uint256 amount
    ) external {
        require(from == _msgSender() || isApprovedForAll(from, _msgSender()), "!AUTHORIZED");
        _burn(from, id, amount);
    }

    function metadataHash(uint256 id) external view returns (bytes32) {
        return _metadataHash[id & ERC1155ERC721Helper.URI_ID];
    }

    function _generateTokenId(
        address creator,
        uint256 supply,
        uint40 packId,
        uint16 numFTs,
        uint16 packIndex
    ) internal view returns (uint256) {
        require(supply > 0 && supply <= ERC1155ERC721Helper.MAX_SUPPLY, "SUPPLY_OUT_OF_BOUNDS");
        require(numFTs >= 0 && numFTs <= ERC1155ERC721Helper.MAX_NUM_FT, "NUM_FT_OUT_OF_BOUNDS");
        return
            uint256(uint160(creator)) *
            ERC1155ERC721Helper.CREATOR_OFFSET_MULTIPLIER + // CREATOR uint160
            (supply == 1 ? uint256(1) * ERC1155ERC721Helper.IS_NFT_OFFSET_MULTIPLIER : 0) + // minted as NFT(1)|FT(0), 1 bit
            uint256(_chainIndex) *
            ERC1155ERC721Helper.CHAIN_INDEX_OFFSET_MULTIPLIER + // mainnet = 0, polygon = 1, uint8
            uint256(packId) *
            ERC1155ERC721Helper.PACK_ID_OFFSET_MULTIPLIER + // packId (unique pack), uint40
            numFTs *
            ERC1155ERC721Helper.PACK_NUM_FT_TYPES_OFFSET_MULTIPLIER + // number of fungible token in the pack, 12 bits
            packIndex; // packIndex (position in the pack), 11 bits
    }
}
