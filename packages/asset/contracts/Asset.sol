//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./ERC2771Handler.sol";
import "./libraries/TokenIdUtils.sol";
import "./interfaces/IAsset.sol";
import "./interfaces/ICatalyst.sol";

contract Asset is
    IAsset,
    Initializable,
    ERC2771Handler,
    ERC1155BurnableUpgradeable,
    AccessControlUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155URIStorageUpgradeable
{
    using TokenIdUtils for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BRIDGE_MINTER_ROLE =
        keccak256("BRIDGE_MINTER_ROLE");

    // a ratio for the amount of copies to burn to retrieve single catalyst for each tier
    mapping(uint256 => uint256) public recyclingAmounts;
    // mapping of creator address to creator nonce, a nonce is incremented every time a creator mints a new token
    mapping(address => uint16) public creatorNonces;
    // mapping of old bridged tokenId to creator nonce
    mapping(uint256 => uint16) public bridgedTokensNonces;
    // mapping of ipfs metadata token hash to token ids
    mapping(string => uint256) public hashUsed;
    // mapping of creator to asset id to asset's reveal nonce
    mapping(address => mapping(uint256 => uint16)) revealNonce;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address forwarder,
        uint256[] calldata catalystTiers,
        uint256[] calldata catalystRecycleCopiesNeeded,
        string memory baseUri
    ) external initializer {
        _setBaseURI(baseUri);
        __AccessControl_init();
        __ERC1155Supply_init();
        __ERC2771Handler_initialize(forwarder);
        __ERC1155Burnable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

        for (uint256 i = 0; i < catalystTiers.length; i++) {
            recyclingAmounts[catalystTiers[i]] = catalystRecycleCopiesNeeded[i];
        }
    }

    /// @notice Mint new token with catalyst tier chosen by the creator
    /// @dev Only callable by the minter role
    /// @param assetData The address of the creator
    /// @param metadataHash The hash string for asset's metadata
    function mint(
        AssetData calldata assetData,
        string memory metadataHash
    ) external onlyRole(MINTER_ROLE) {
        // increment nonce
        unchecked {
            creatorNonces[assetData.creator]++;
        }
        // get current creator nonce
        uint16 nonce = creatorNonces[assetData.creator];
        require(assetData.creatorNonce == nonce, "INVALID_NONCE");
        // generate token id by providing the creator address, the amount, catalyst tier and if it should mint as revealed
        uint256 id = TokenIdUtils.generateTokenId(
            assetData.creator,
            assetData.tier,
            nonce,
            assetData.revealed ? 1 : 0
        );
        // mint the tokens
        _mint(assetData.creator, id, assetData.amount, "");
        require(hashUsed[metadataHash] == 0, "metadata hash already used");
        hashUsed[metadataHash] = id;
        _setURI(id, metadataHash);
    }

    /// @notice Mint new tokens with catalyst tier chosen by the creator
    /// @dev Only callable by the minter role
    /// @param assetData The array of asset data
    /// @param metadatas The array of hashes for asset metadata
    function mintBatch(
        AssetData[] calldata assetData,
        string[] memory metadatas
    ) external onlyRole(MINTER_ROLE) {
        // generate token ids by providing the creator address, the amount, catalyst tier and if it should mint as revealed
        uint256[] memory tokenIds = new uint256[](assetData.length);
        uint256[] memory amounts = new uint256[](assetData.length);
        address creator = assetData[0].creator;
        // generate token ids
        for (uint256 i = 0; i < assetData.length; ) {
            unchecked {
                creatorNonces[creator]++;
            }
            require(
                assetData[i].creatorNonce == creatorNonces[creator],
                "INVALID_NONCE"
            );
            tokenIds[i] = TokenIdUtils.generateTokenId(
                creator,
                assetData[i].tier,
                creatorNonces[creator],
                assetData[i].revealed ? 1 : 0
            );
            amounts[i] = assetData[i].amount;
            require(hashUsed[metadatas[i]] == 0, "metadata hash already used");
            hashUsed[metadatas[i]] = tokenIds[i];
            _setURI(tokenIds[i], metadatas[i]);
            i++;
        }
        // finally mint the tokens
        _mintBatch(creator, tokenIds, amounts, "");
    }

    /// @notice Mint TSB special tokens
    /// @dev Only callable by the minter role
    /// @dev Those tokens are minted by TSB admins and do not adhere to the normal minting rules
    /// @param recipient The address of the recipient
    /// @param assetData The data of the asset to mint
    /// @param metadataHash The ipfs hash for asset's metadata
    function mintSpecial(
        address recipient,
        AssetData calldata assetData,
        string memory metadataHash
    ) external onlyRole(MINTER_ROLE) {
        // increment nonce
        unchecked {
            creatorNonces[assetData.creator]++;
        }
        // get current creator nonce
        uint16 creatorNonce = creatorNonces[assetData.creator];

        // minting a tsb exclusive token which are already revealed, have their supply increased and are not recyclable
        uint256 id = TokenIdUtils.generateTokenId(
            assetData.creator,
            assetData.tier,
            creatorNonce,
            1
        );
        _mint(recipient, id, assetData.amount, "");
        require(hashUsed[metadataHash] == 0, "metadata hash already used");
        hashUsed[metadataHash] = id;
        _setURI(id, metadataHash);
    }

    function revealMint(
        address recipient,
        uint256 amount,
        uint256 prevTokenId,
        string[] memory metadataHashes
    ) external onlyRole(MINTER_ROLE) returns (uint256[] memory tokenIds) {
        // get data from the previous token id
        AssetData memory data = prevTokenId.getData();

        // check if the token is already revealed
        require(!data.revealed, "Asset: already revealed");

        uint256[] memory amounts = new uint256[](amount);
        tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; ) {
            amounts[i] = 1;
            if (hashUsed[metadataHashes[i]] != 0) {
                tokenIds[i] = hashUsed[metadataHashes[i]];
            } else {
                uint16 nonce = revealNonce[data.creator][prevTokenId]++;

                tokenIds[i] = TokenIdUtils.generateTokenId(
                    data.creator,
                    data.tier,
                    data.creatorNonce,
                    nonce
                );

                hashUsed[metadataHashes[i]] = tokenIds[i];
            }
            _setURI(tokenIds[i], metadataHashes[i]);
            unchecked {
                i++;
            }
        }

        _mintBatch(recipient, tokenIds, amounts, "");
    }

    /// @notice Special mint function for the bridge contract to mint assets originally created on L1
    /// @dev Only the special minter role can call this function
    /// @dev This function skips the catalyst burn step
    /// @dev Bridge should be able to mint more copies of the same asset
    /// @param originalTokenId The original token id of the asset
    /// @param amount The amount of assets to mint
    /// @param tier The tier of the catalysts to burn
    /// @param recipient The recipient of the asset
    /// @param metadataHash The ipfs hash of asset's metadata
    function bridgeMint(
        uint256 originalTokenId,
        uint256 amount,
        uint8 tier,
        address recipient,
        string memory metadataHash
    ) external onlyRole(BRIDGE_MINTER_ROLE) {
        // extract creator address from the last 160 bits of the original token id
        address originalCreator = address(uint160(originalTokenId));
        // extract isNFT from 1 bit after the creator address
        bool isNFT = (originalTokenId >> 95) & 1 == 1;
        require(amount > 0, "Amount must be > 0");
        if (isNFT) {
            require(amount == 1, "Amount must be 1 for NFTs");
        }
        // check if this asset has been bridged before to make sure that we increase the copies count for the same assers rather than minting a new one
        // we also do this to avoid a clash between bridged asset nonces and non-bridged asset nonces
        if (bridgedTokensNonces[originalTokenId] == 0) {
            // increment nonce
            unchecked {
                creatorNonces[originalCreator]++;
            }
            // get current creator nonce
            uint16 nonce = creatorNonces[originalCreator];

            // store the nonce
            bridgedTokensNonces[originalTokenId] = nonce;
        }

        uint256 id = TokenIdUtils.generateTokenId(
            originalCreator,
            tier,
            bridgedTokensNonces[originalTokenId],
            1
        );
        _mint(recipient, id, amount, "");
        if (hashUsed[metadataHash] != 0) {
            require(hashUsed[metadataHash] == id, "metadata hash already used");
        } else {
            hashUsed[metadataHash] = id;
        }
        _setURI(id, metadataHash);
    }

    /// @notice Extract the catalyst by burning assets of the same tier
    /// @param tokenIds the tokenIds of the assets to extract, must be of same tier
    /// @param amounts the amount of each asset to extract catalyst from
    /// @param catalystTier the catalyst tier to extract
    /// @return amountOfCatalystExtracted the amount of catalyst extracted
    function recycleBurn(
        address recycler,
        uint256[] calldata tokenIds,
        uint256[] calldata amounts,
        uint256 catalystTier
    )
        external
        onlyRole(MINTER_ROLE)
        returns (uint256 amountOfCatalystExtracted)
    {
        uint256 totalAmount = 0;
        // how many assets of a given tier are needed to recycle a catalyst
        uint256 recyclingAmount = recyclingAmounts[catalystTier];
        require(
            recyclingAmount > 0,
            "Catalyst tier is not eligible for recycling"
        );
        // make sure the tokens that user is trying to extract are of correct tier and user has enough tokens
        for (uint i = 0; i < tokenIds.length; i++) {
            uint256 extractedTier = (tokenIds[i]).getTier();
            require(
                extractedTier == catalystTier,
                "Catalyst id does not match"
            );
            totalAmount += amounts[i];
        }

        // total amount should be a modulo of recyclingAmounts[catalystTier] to make sure user is recycling the correct amount of tokens
        require(
            totalAmount % recyclingAmounts[catalystTier] == 0,
            "Incorrect amount of tokens to recycle"
        );
        // burn batch of tokens
        _burnBatch(recycler, tokenIds, amounts);

        // calculate how many catalysts to mint
        uint256 catalystsExtractedCount = totalAmount /
            recyclingAmounts[catalystTier];

        emit AssetsRecycled(
            recycler,
            tokenIds,
            amounts,
            catalystTier,
            catalystsExtractedCount
        );

        return catalystsExtractedCount;
    }

    /// @notice Burn a token from a given account
    /// @dev Only the minter role can burn tokens
    /// @dev This function was added with token recycling and bridging in mind but may have other use cases
    /// @param account The account to burn tokens from
    /// @param id The token id to burn
    /// @param amount The amount of tokens to burn
    function burnFrom(
        address account,
        uint256 id,
        uint256 amount
    ) external onlyRole(MINTER_ROLE) {
        _burn(account, id, amount);
    }

    /// @notice Burn a batch of tokens from a given account
    /// @dev Only the minter role can burn tokens
    /// @dev This function was added with token recycling and bridging in mind but may have other use cases
    /// @dev The length of the ids and amounts arrays must be the same
    /// @param account The account to burn tokens from
    /// @param ids An array of token ids to burn
    /// @param amounts An array of amounts of tokens to burn
    function burnBatchFrom(
        address account,
        uint256[] memory ids,
        uint256[] memory amounts
    ) external onlyRole(MINTER_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /// @notice Set the amount of tokens that can be recycled for a given one catalyst of a given tier
    /// @dev Only the admin role can set the recycling amount
    /// @param catalystTokenId The catalyst token id
    /// @param amount The amount of tokens needed to receive one catalyst
    function setRecyclingAmount(
        uint256 catalystTokenId,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        // catalyst 0 is restricted for tsb exclusive tokens
        require(catalystTokenId > 0, "Catalyst token id cannot be 0");
        recyclingAmounts[catalystTokenId] = amount;
    }

    /// @notice Set a new URI for specific tokenid
    /// @param tokenId The token id to set URI for
    /// @param metadata The new uri for asset's metadata
    function setTokenUri(
        uint256 tokenId,
        string memory metadata
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setURI(tokenId, metadata);
    }

    /// @notice Set a new base URI
    /// @param baseURI The new base URI
    function setBaseURI(
        string memory baseURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(baseURI);
    }

    /// @notice returns full token URI, including baseURI and token metadata URI
    /// @param tokenId The token id to get URI for
    /// @return tokenURI the URI of the token
    function uri(
        uint256 tokenId
    )
        public
        view
        override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
        returns (string memory)
    {
        return ERC1155URIStorageUpgradeable.uri(tokenId);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(
        bytes4 id
    )
        public
        view
        virtual
        override(ERC1155Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return
            id == type(IERC165Upgradeable).interfaceId ||
            id == type(IERC1155Upgradeable).interfaceId ||
            id == type(IERC1155MetadataURIUpgradeable).interfaceId ||
            id == type(IAccessControlUpgradeable).interfaceId ||
            id == 0x572b6c05; // ERC2771
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (address sender)
    {
        return ERC2771Handler._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771Handler)
        returns (bytes calldata)
    {
        return ERC2771Handler._msgData();
    }

    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal override(ERC1155Upgradeable, ERC1155SupplyUpgradeable) {
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }

    function getRecyclingAmount(
        uint256 catalystTokenId
    ) public view returns (uint256) {
        return recyclingAmounts[catalystTokenId];
    }
}
