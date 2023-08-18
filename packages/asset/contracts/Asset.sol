//SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {
    AccessControlUpgradeable,
    ContextUpgradeable
} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {
    ERC1155BurnableUpgradeable,
    ERC1155Upgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155BurnableUpgradeable.sol";
import {
    ERC1155SupplyUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155SupplyUpgradeable.sol";
import {
    ERC1155URIStorageUpgradeable
} from "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {
    ERC2771HandlerUpgradeable
} from "@sandbox-smart-contracts/dependency-metatx/contracts/ERC2771HandlerUpgradeable.sol";
import {
    MultiRoyaltyDistributor
} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/MultiRoyaltyDistributor.sol";
import {
    OperatorFiltererUpgradeable,
    IOperatorFilterRegistry
} from "@sandbox-smart-contracts/dependency-operator-filter/contracts/OperatorFiltererUpgradeable.sol";
import {TokenIdUtils} from "./libraries/TokenIdUtils.sol";
import {IAsset} from "./interfaces/IAsset.sol";
import {ITokenUtils, IRoyaltyUGC} from "./interfaces/ITokenUtils.sol";

contract Asset is
    IAsset,
    Initializable,
    ERC2771HandlerUpgradeable,
    ERC1155BurnableUpgradeable,
    AccessControlUpgradeable,
    ERC1155SupplyUpgradeable,
    ERC1155URIStorageUpgradeable,
    OperatorFiltererUpgradeable,
    MultiRoyaltyDistributor,
    ITokenUtils
{
    using TokenIdUtils for uint256;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant MODERATOR_ROLE = keccak256("MODERATOR_ROLE");

    // mapping of ipfs metadata token hash to token id
    mapping(string => uint256) public hashUsed;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address forwarder,
        address assetAdmin,
        string memory baseUri,
        address commonSubscription,
        address _manager
    ) external initializer {
        _setBaseURI(baseUri);
        __AccessControl_init();
        __ERC1155Supply_init();
        __ERC2771Handler_init(forwarder);
        __ERC1155Burnable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, assetAdmin);
        __OperatorFilterer_init(commonSubscription, true);
        __MultiRoyaltyDistributor_init(_manager);
    }

    /// @notice Mint new tokens
    /// @dev Only callable by the minter role
    /// @param to The address of the recipient
    /// @param id The id of the token to mint
    /// @param amount The amount of the token to mint
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        string memory metadataHash
    ) external onlyRole(MINTER_ROLE) {
        _setMetadataHash(id, metadataHash);
        _mint(to, id, amount, "");
        address creator = id.getCreatorAddress();
        _setTokenRoyalties(id, payable(creator), creator);
    }

    /// @notice Mint new tokens with catalyst tier chosen by the creator
    /// @dev Only callable by the minter role
    /// @param to The address of the recipient
    /// @param ids The ids of the tokens to mint
    /// @param amounts The amounts of the tokens to mint
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        string[] memory metadataHashes
    ) external onlyRole(MINTER_ROLE) {
        require(ids.length == metadataHashes.length, "Asset: ids and metadataHash length mismatch");
        require(ids.length == amounts.length, "Asset: ids and amounts length mismatch");
        for (uint256 i = 0; i < ids.length; i++) {
            _setMetadataHash(ids[i], metadataHashes[i]);
        }
        _mintBatch(to, ids, amounts, "");
        for (uint256 i; i < ids.length; i++) {
            address creator = ids[i].getCreatorAddress();
            _setTokenRoyalties(ids[i], payable(creator), creator);
        }
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
    ) external onlyRole(BURNER_ROLE) {
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
    ) external onlyRole(BURNER_ROLE) {
        _burnBatch(account, ids, amounts);
    }

    /// @notice Set a new URI for specific tokenid
    /// @dev The metadata hash should be the IPFS CIDv1 base32 encoded hash
    /// @param tokenId The token id to set URI for
    /// @param metadata The new URI for asset's metadata
    function setTokenURI(uint256 tokenId, string memory metadata) external onlyRole(MODERATOR_ROLE) {
        _setURI(tokenId, metadata);
    }

    /// @notice Set a new base URI
    /// @param baseURI The new base URI
    function setBaseURI(string memory baseURI) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setBaseURI(baseURI);
    }

    /// @notice returns full token URI, including baseURI and token metadata URI
    /// @param tokenId The token id to get URI for
    /// @return tokenURI the URI of the token
    function uri(uint256 tokenId)
        public
        view
        override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
        returns (string memory)
    {
        return ERC1155URIStorageUpgradeable.uri(tokenId);
    }

    function getTokenIdByMetadataHash(string memory metadataHash) public view returns (uint256) {
        return hashUsed[metadataHash];
    }

    function _setMetadataHash(uint256 tokenId, string memory metadataHash) internal {
        if (hashUsed[metadataHash] != 0) {
            require(hashUsed[metadataHash] == tokenId, "Asset: not allowed to reuse metadata hash");
        } else {
            hashUsed[metadataHash] = tokenId;
            _setURI(tokenId, metadataHash);
        }
    }

    /// @notice Set a new trusted forwarder address, limited to DEFAULT_ADMIN_ROLE only
    /// @dev Change the address of the trusted forwarder for meta-TX
    /// @param trustedForwarder The new trustedForwarder
    function setTrustedForwarder(address trustedForwarder) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(trustedForwarder != address(0), "Asset: trusted forwarder can't be zero address");
        _setTrustedForwarder(trustedForwarder);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param id the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 id)
        public
        view
        virtual
        override(ERC1155Upgradeable, AccessControlUpgradeable, MultiRoyaltyDistributor)
        returns (bool)
    {
        return id == type(IRoyaltyUGC).interfaceId || super.supportsInterface(id);
    }

    function _msgSender()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (address sender)
    {
        return ERC2771HandlerUpgradeable._msgSender();
    }

    function _msgData()
        internal
        view
        virtual
        override(ContextUpgradeable, ERC2771HandlerUpgradeable)
        returns (bytes calldata)
    {
        return ERC2771HandlerUpgradeable._msgData();
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

    /// @notice Transfers `values` tokens of type `ids` from  `from` to `to` (with safety call).
    /// @dev call data should be optimized to order ids so packedBalance can be used efficiently.
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param ids ids of each token type transfered.
    /// @param amounts amount of each token type transfered.
    /// @param data aditional data accompanying the transfer.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override onlyAllowedOperator(from) {
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    /// @notice Enable or disable approval for `operator` to manage all of the caller's tokens.
    /// @param operator address which will be granted rights to transfer all tokens of the caller.
    /// @param approved whether to approve or revoke
    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
        onlyAllowedOperatorApproval(operator)
    {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param amount amount of token transfered.
    /// @param data aditional data accompanying the transfer.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override onlyAllowedOperator(from) {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not token owner or approved"
        );
        _safeTransferFrom(from, to, id, amount, data);
    }

    /// @notice could be used to deploy splitter and set tokens royalties
    /// @param tokenId the id of the token for which the EIP2981 royalty is set for.
    /// @param recipient the royalty recipient for the splitter of the creator.
    /// @param creator the creactor of the tokens.
    function setTokenRoyalties(
        uint256 tokenId,
        address payable recipient,
        address creator
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokenRoyalties(tokenId, recipient, creator);
    }

    /// @notice Extracts the creator address from a given token id
    /// @param tokenId The token id to extract the creator address from
    /// @return creator The asset creator address
    function getCreatorAddress(uint256 tokenId) external pure returns (address creator) {
        return TokenIdUtils.getCreatorAddress(tokenId);
    }

    /// @notice Extracts the tier from a given token id
    /// @param tokenId The token id to extract the tier from
    /// @return tier The asset tier, determined by the catalyst used to create it
    function getTier(uint256 tokenId) external pure returns (uint8 tier) {
        return TokenIdUtils.getTier(tokenId);
    }

    /// @notice Extracts the revealed flag from a given token id
    /// @param tokenId The token id to extract the revealed flag from
    /// @return isRevealed Whether the asset is revealed or not
    function isRevealed(uint256 tokenId) external pure returns (bool) {
        return TokenIdUtils.isRevealed(tokenId);
    }

    /// @notice Extracts the asset nonce from a given token id
    /// @param tokenId The token id to extract the asset nonce from
    /// @return creatorNonce The asset creator nonce
    function getCreatorNonce(uint256 tokenId) external pure returns (uint16) {
        return TokenIdUtils.getCreatorNonce(tokenId);
    }

    /// @notice Extracts the abilities and enhancements hash from a given token id
    /// @param tokenId The token id to extract reveal nonce from
    /// @return revealNonce The reveal nonce of the asset
    function getRevealNonce(uint256 tokenId) external pure returns (uint16) {
        return TokenIdUtils.getRevealNonce(tokenId);
    }

    /// @notice Extracts the bridged flag from a given token id
    /// @param tokenId The token id to extract the bridged flag from
    /// @return bridged Whether the asset is bridged or not
    function isBridged(uint256 tokenId) external pure returns (bool) {
        return TokenIdUtils.isBridged(tokenId);
    }

    /// @notice This function is used to register Asset contract on the Operator Filterer Registry of Opensea.can only be called by admin.
    /// @dev used to register contract and subscribe to the subscriptionOrRegistrantToCopy's black list.
    /// @param subscriptionOrRegistrantToCopy registration address of the list to subscribe.
    /// @param subscribe bool to signify subscription "true"" or to copy the list "false".
    function registerAndSubscribe(address subscriptionOrRegistrantToCopy, bool subscribe)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(subscriptionOrRegistrantToCopy != address(0), "Asset: subscription can't be zero address");
        _registerAndSubscribe(subscriptionOrRegistrantToCopy, subscribe);
    }

    /// @notice sets filter registry address deployed in test
    /// @param registry the address of the registry
    function setOperatorRegistry(address registry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(registry != address(0), "Asset: registry can't be zero address");
        operatorFilterRegistry = IOperatorFilterRegistry(registry);
    }
}
