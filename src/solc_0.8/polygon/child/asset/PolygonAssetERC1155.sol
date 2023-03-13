//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../../../assetERC1155/AssetBaseERC1155.sol";
import "../../../common/interfaces/pos-portal/child/IChildToken.sol";
import {
    DefaultOperatorFiltererUpgradeable
} from "../../../OperatorFilterer/contracts/upgradeable/DefaultOperatorFiltererUpgradeable.sol";
import {
    OperatorFiltererUpgradeable
} from "../../../OperatorFilterer/contracts/upgradeable/OperatorFiltererUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title This contract is for AssetERC1155 which can be minted by a minter role.
/// @dev AssetERC1155 will be minted only on L2 and can be transferred to L1 and not minted on L1.
/// @dev This contract supports meta transactions.
/// @dev This contract is final, don't inherit from it.
contract PolygonAssetERC1155 is AssetBaseERC1155, IChildToken, Initializable, OperatorFiltererUpgradeable {
    address public _childChainManager;

    function initialize(
        address trustedForwarder,
        address admin,
        address bouncerAdmin,
        address childChainManager,
        IAssetERC721 polygonAssetERC721,
        uint8 chainIndex,
        address subscription
    ) external initializer {
        require(address(childChainManager) != address(0), "PolygonAssetERC1155Tunnel: childChainManager can't be zero");
        init(trustedForwarder, admin, bouncerAdmin, polygonAssetERC721, chainIndex);
        _childChainManager = childChainManager;
        __OperatorFilterer_init(subscription, true);
    }

    /// @notice Mint a token type for `creator` on slot `packId`.
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
    /// @dev Should be used only by PolygonAssetERC1155Tunnel.
    /// @dev This function can be called when the token ID exists on another layer.
    /// @dev Encoded bytes32 metadata hash must be provided as data.
    /// @param owner address that will receive the tokens.
    /// @param id the id of the newly minted token.
    /// @param supply number of tokens minted for that token type.
    /// @param data token metadata.
    function mint(
        address owner,
        uint256 id,
        uint256 supply,
        bytes calldata data
    ) external {
        require(isBouncer(_msgSender()), "!BOUNCER");
        require(data.length > 0, "METADATA_MISSING");
        require(owner != address(0), "TO==0");
        uint256 uriId = id & ERC1155ERC721Helper.URI_ID;
        require(uint256(_metadataHash[uriId]) == 0, "ID_TAKEN");
        _metadataHash[uriId] = abi.decode(data, (bytes32));
        _mint(_msgSender(), owner, id, supply, data);
    }

    /// @notice Mint multiple token types for `creator` on slot `packId`.
    /// @dev For this function it is not required to provide data.
    /// @param creator address of the creator of the tokens.
    /// @param packId unique packId for the tokens.
    /// @param hash hash of an IPFS cidv1 folder that contains the metadata of each token type in the files: 0.json, 1.json, 2.json, etc...
    /// @param supplies number of tokens minted for each token type.
    /// @param rarityPack rarity power of each token types packed into 2 bits each.
    /// @param owner address that will receive the tokens.
    /// @param data extra data to accompany the minting call.
    /// @return ids the ids of each newly minted token types.
    function mintMultiple(
        address creator,
        uint40 packId,
        bytes32 hash,
        uint256[] calldata supplies,
        bytes calldata rarityPack,
        address owner,
        bytes calldata data
    ) external returns (uint256[] memory ids) {
        require(hash != 0, "HASH==0");
        require(isBouncer(_msgSender()), "!BOUNCER");
        require(owner != address(0), "TO==0");
        ids = _allocateIds(creator, supplies, rarityPack, packId, hash);
        _mintBatch(owner, ids, supplies, data);
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
        require(isBouncer(_msgSender()), "!BOUNCER");
        _mintDeficit(account, id, amount);
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

    /// @notice This function is called when a token is deposited to the root chain.
    /// @dev Should be callable only by ChildChainManager.
    /// @dev Should handle deposit by minting the required tokenId(s) for user.
    /// @dev Minting can also be done by other functions.
    /// @param user user address for whom deposit is being done.
    /// @param depositData abi encoded tokenIds. Batch deposit also supported.
    function deposit(address user, bytes calldata depositData) external override {
        require(_msgSender() == _childChainManager, "!DEPOSITOR");
        require(user != address(0), "INVALID_DEPOSIT_USER");
        (uint256[] memory ids, uint256[] memory amounts, bytes memory data) =
            abi.decode(depositData, (uint256[], uint256[], bytes));

        _mintBatches(user, ids, amounts, data);
    }

    /// @notice called when user wants to withdraw single token back to root chain.
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain.
    /// @param id id to withdraw.
    /// @param amount amount to withdraw.
    function withdrawSingle(uint256 id, uint256 amount) external {
        _burn(_msgSender(), id, amount);
    }

    /// @notice called when user wants to batch withdraw tokens back to root chain.
    /// @dev Should burn user's tokens. This transaction will be verified when exiting on root chain.
    /// @param ids ids to withdraw.
    /// @param amounts amounts to withdraw.
    function withdrawBatch(uint256[] calldata ids, uint256[] calldata amounts) external {
        _burnBatch(_msgSender(), ids, amounts);
    }

    /// @notice gets the metadata hash set for the and asset with id "id"
    /// @param id the id of the asset whose  metadata hash has to be returned
    function metadataHash(uint256 id) external view returns (bytes32) {
        return _metadataHash[id & ERC1155ERC721Helper.URI_ID];
    }

    function _allocateIds(
        address creator,
        uint256[] memory supplies,
        bytes memory rarityPack,
        uint40 packId,
        bytes32 hash
    ) internal returns (uint256[] memory ids) {
        require(supplies.length > 0, "SUPPLIES<=0");
        require(supplies.length <= ERC1155ERC721Helper.MAX_PACK_SIZE, "BATCH_TOO_BIG");
        ids = _generateTokenIds(creator, supplies, packId);

        require(uint256(_metadataHash[ids[0] & ERC1155ERC721Helper.URI_ID]) == 0, "ID_TAKEN");
        _metadataHash[ids[0] & ERC1155ERC721Helper.URI_ID] = hash;
        _rarityPacks[ids[0] & ERC1155ERC721Helper.URI_ID] = rarityPack;
    }

    function _generateTokenIds(
        address creator,
        uint256[] memory supplies,
        uint40 packId
    ) internal view returns (uint256[] memory) {
        uint16 numTokenTypes = uint16(supplies.length);
        uint256[] memory ids = new uint256[](numTokenTypes);
        uint16 numNFTs = 0;
        for (uint16 i = 0; i < numTokenTypes; i++) {
            if (numNFTs == 0) {
                if (supplies[i] == 1) {
                    numNFTs = uint16(numTokenTypes - i);
                }
            } else {
                require(supplies[i] == 1, "NFTS_MUST_BE_LAST");
            }
        }
        uint16 numFTs = numTokenTypes - numNFTs;
        for (uint16 i = 0; i < numTokenTypes; i++) {
            ids[i] = _generateTokenId(creator, supplies[i], packId, numFTs, i);
        }
        return ids;
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

    /// @notice Transfers `value` tokens of type `id` from  `from` to `to`  (with safety call).
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param id the token type transfered.
    /// @param value amount of token transfered.
    /// @param data aditional data accompanying the transfer.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external override onlyAllowedOperator(from) {
        super._safeTransferFrom(from, to, id, value, data);
    }

    /// @notice Transfers `values` tokens of type `ids` from  `from` to `to` (with safety call).
    /// @dev call data should be optimized to order ids so packedBalance can be used efficiently.
    /// @param from address from which tokens are transfered.
    /// @param to address to which the token will be transfered.
    /// @param ids ids of each token type transfered.
    /// @param values amount of each token type transfered.
    /// @param data aditional data accompanying the transfer.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external override onlyAllowedOperator(from) {
        super._safeBatchTransferFrom(from, to, ids, values, data);
    }

    /// @notice Enable or disable approval for `operator` to manage all `sender`'s tokens.
    /// @dev used for Meta Transaction (from metaTransactionContract).
    /// @param sender address which grant approval.
    /// @param operator address which will be granted rights to transfer all token owned by `sender`.
    /// @param approved whether to approve or revoke.
    function setApprovalForAllFor(
        address sender,
        address operator,
        bool approved
    ) external onlyAllowedOperatorApproval(operator) {
        super._setApprovalForAll(sender, operator, approved);
    }

    /// @notice Enable or disable approval for `operator` to manage all of the caller's tokens.
    /// @param operator address which will be granted rights to transfer all tokens of the caller.
    /// @param approved whether to approve or revoke
    function setApprovalForAll(address operator, bool approved)
        external
        override(IERC1155)
        onlyAllowedOperatorApproval(operator)
    {
        super._setApprovalForAll(_msgSender(), operator, approved);
    }
}
