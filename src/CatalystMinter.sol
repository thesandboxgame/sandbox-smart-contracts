pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./contracts_common/src/Interfaces/ERC20.sol";
import "./Interfaces/ERC20Extended.sol";
import "./contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "./contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "./Catalyst/ERC20Group.sol";
import "./Catalyst/CatalystToken.sol";
import "./CatalystRegistry.sol";

contract CatalystMinter is MetaTransactionReceiver {
    /// @notice mint common Asset token by paying the Sand fee
    /// @param from address creating the Asset, need to be the tx sender or meta tx signer
    /// @param packId unused packId that will let you predict the resulting tokenId
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata
    /// @param catalystToken address of the Catalyst ERC20 token to burn
    /// @param gemIds list of gem ids to burn in the catalyst
    /// @param to address receiving the minted tokens
    /// @param data extra data
    function mint(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        CatalystToken catalystToken,
        uint256[] calldata gemIds,
        address to,
        bytes calldata data
    ) external returns (uint256) {
        _checkAuthorization(from, to);
        _checkAndBurnCatalyst(from, catalystToken);
        (uint8 rarity, uint16 maxGems, uint64 quantity) = catalystToken.getMintData();
        _checkAndBurnGems(from, maxGems, gemIds);

        _sand.burnFor(from, quantity * _sandFee);
        
        uint256 id = _asset.mint(from, packId, metadataHash, quantity, rarity, to, data);
        
        _catalystRegistry.setCatalyst(id, catalystToken, gemIds);
        
        return id;
    }

    function extractAndChangeCatalyst(
        address from,
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] calldata gemIds,
        address to
    ) external {
        _checkAuthorization(from, to);
        uint256 id = _asset.extractERC721From(from, assetId, from);
        _changeCatalyst(from, id, catalystToken, gemIds, to); 
    }

    function changeCatalyst(
        address from,
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] calldata gemIds,
        address to
    ) external {
        _checkAuthorization(from, to);
        _changeCatalyst(from, assetId, catalystToken, gemIds, to);
    }


    function extractAndAddGems(
        address from,
        uint256 assetId,
        uint256[] calldata gemIds,
        address to
    ) external {
        _checkAuthorization(from, to);
        uint256 id = _asset.extractERC721From(from, assetId, from);
        _addGems(from, id, gemIds, to); 
    }

    function addGems(
        address from,
        uint256 assetId,
        uint256[] calldata gemIds,
        address to
    ) external {
        _checkAuthorization(from, to);
        _addGems(from, assetId, gemIds, to);
    }

    function mintMultiple(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        CatalystToken[] calldata catalystTokens,
        uint256[] calldata numGems,
        uint256[] calldata gemIds,
        address to,
        bytes calldata data
    ) external returns (uint256[] memory ids) {
        require(numGems.length == catalystTokens.length, "invalid length");
        _checkAuthorization(from, to);
        _mintMultiple(from, packId, metadataHash, catalystTokens, numGems, gemIds, to, data);
    }

    // //////////////////// INTERNALS ////////////////////

    function _mintMultiple(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        CatalystToken[] memory catalystTokens,
        uint256[] memory numGems,
        uint256[] memory gemIds,
        address to,
        bytes memory data
    ) internal {
        (uint256 totalQuantity, uint256[] memory supplies, bytes memory rarities) = _handleMultipleCatalysts(from, catalystTokens, numGems);

        _sand.burnFor(from, totalQuantity * _sandFee);

        _mintAssets(from, packId, metadataHash, catalystTokens, numGems, gemIds, supplies, rarities, to, data);
    }

    function _handleMultipleCatalysts(
        address from,
        CatalystToken[] memory catalystTokens,
        uint256[] memory numGems
    ) internal returns(uint256 totalQuantity, uint256[] memory supplies, bytes memory rarities) {
        totalQuantity = 0;
        
        supplies = new uint256[](catalystTokens.length);
        rarities = new bytes(catalystTokens.length / 4); // TODO
        
        for(uint256 i = 0; i < catalystTokens.length; i++) {
            CatalystToken catalystToken = catalystTokens[i];
            _checkAndBurnCatalyst(from, catalystToken);
            (uint8 rarity, uint16 maxGems, uint64 quantity) = catalystToken.getMintData();
            totalQuantity += uint256(quantity);
            supplies[i] = quantity;
            require(numGems[i] <= maxGems, "too many gems for catalyst");
            // TODO rarities    
        }
    }

    function _mintAssets(
        address from,
        uint40 packId,
        bytes32 metadataHash,
        CatalystToken[] memory catalystTokens,
        uint256[] memory numGems,
        uint256[] memory gemIds,
        uint256[] memory supplies,
        bytes memory rarities,
        address to,
        bytes memory data
    ) internal {
        _gems.burnEachFor(from, gemIds, 1);
        
        uint256[] memory tokenIds = _asset.mintMultiple(from, packId, metadataHash, supplies, rarities, to, data);
        
        uint256 counter = 0;
        for(uint256 i = 0; i < tokenIds.length; i++) {
            uint256[] memory subGemIds = new uint256[](numGems[i]);
            for (uint256 j = 0 ; j < subGemIds.length; j++) {
                require(counter+j < gemIds.length, "notenough gemIds");
                subGemIds[j] = gemIds[counter+j];
            }
            _catalystRegistry.setCatalyst(tokenIds[i], catalystTokens[i], subGemIds);
            counter += subGemIds.length;
        }
    }

    function _changeCatalyst(
        address from,
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] memory gemIds,
        address to
    ) internal {
        require(assetId & IS_NFT > 0, "NEED TO BE AN NFT"); // Asset (ERC1155ERC721.sol) ensure NFT will return true here and non-NFT will reyrn false
        _checkAndBurnCatalyst(from, catalystToken);
        (uint8 rarity, uint16 maxGems, uint64 quantity) = catalystToken.getMintData();
        _checkAndBurnGems(from, maxGems, gemIds);

        _catalystRegistry.setCatalyst(assetId, catalystToken, gemIds);

        _transfer(from, to, assetId);
    }

    function _addGems(
        address from,
        uint256 assetId,
        uint256[] memory gemIds,
        address to
    ) internal {
        require(assetId & IS_NFT > 0, "NEED TO BE AN NFT"); // Asset (ERC1155ERC721.sol) ensure NFT will return true here and non-NFT will reyrn false
        CatalystRegistry.Catalyst memory catalyst = _catalystRegistry.getCatalyst(assetId);
        (uint8 rarity, uint16 maxGems, uint64 quantity) = catalyst.token.getMintData();
        require(gemIds.length + catalyst.gems.length <= maxGems, "too many gems");
        
        _catalystRegistry.addGems(assetId, gemIds);

        _transfer(from, to, assetId);
    }

    function _transfer(address from, address to, uint256 assetId) internal {
        if (from != to) {
            _asset.safeTransferFrom(from, to, assetId);   
        }
    }

    function _checkAuthorization(
        address from,
        address to
    ) internal {
        require(to != address(0), "INVALID ADDRESS ZERO");
        require(from == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
    }

    function _checkAndBurnGems(address from, uint256 maxGems, uint256[] memory gemIds) internal {
        require(gemIds.length <= maxGems, "too many gems");
        _gems.burnEachFor(from, gemIds, 1);
    }

    function _checkAndBurnCatalyst(address from, CatalystToken catalystToken) internal {
        require(_validCatalysts[catalystToken], "invalid catalyst");
        catalystToken.burnFor(from, 1);
    }


    // ////////////////// FROM ERC1155ERC721.sol ////////////

    // function generateTokenId(
    //     address creator,
    //     uint256 supply,
    //     uint40 packId,
    //     uint16 numFTs,
    //     uint16 packIndex
    // ) internal pure returns (uint256) {
    //     require(supply > 0 && supply <= MAX_SUPPLY, "invalid supply");

    //     return
    //         uint256(creator) *
    //         CREATOR_OFFSET_MULTIPLIER + // CREATOR
    //         (supply == 1 ? uint256(1) * IS_NFT_OFFSET_MULTIPLIER : 0) + // minted as NFT (1) or FT (0) // IS_NFT
    //         uint256(packId) *
    //         PACK_ID_OFFSET_MULTIPLIER + // packId (unique pack) // PACk_ID
    //         numFTs *
    //         PACK_NUM_FT_TYPES_OFFSET_MULTIPLIER + // number of fungible token in the pack // PACK_NUM_FT_TYPES
    //         packIndex; // packIndex (position in the pack) // PACK_INDEX
    // }

    // function generateTokenIds(
    //     address creator,
    //     uint256[] memory supplies,
    //     uint40 packId
    // ) internal pure returns (uint256[] memory, uint16) {
    //     uint16 numTokenTypes = uint16(supplies.length);
    //     uint256[] memory ids = new uint256[](numTokenTypes);
    //     uint16 numNFTs = 0;
    //     for (uint16 i = 0; i < numTokenTypes; i++) {
    //         if (numNFTs == 0) {
    //             if (supplies[i] == 1) {
    //                 numNFTs = uint16(numTokenTypes - i);
    //             }
    //         } else {
    //             require(supplies[i] == 1, "NFTs need to be put at the end");
    //         }
    //     }
    //     uint16 numFTs = numTokenTypes - numNFTs;
    //     for (uint16 i = 0; i < numTokenTypes; i++) {
    //         ids[i] = generateTokenId(creator, supplies[i], packId, numFTs, i);
    //     }
    //     return (ids, numNFTs);
    // }

    // /////////////////// UTILITIES /////////////////////
    using SafeMathWithRequire for uint256;

    // //////////////////////// DATA /////////////////////
    uint256 private constant IS_NFT = 0x0000000000000000000000000000000000000000800000000000000000000000;

    ERC20Extended _sand;
    AssetToken _asset;
    ERC20Group _gems;
    mapping(CatalystToken => bool) _validCatalysts;
    CatalystRegistry _catalystRegistry;

    uint256 constant _sandFee = 1000000000000000000; // TODO fee and feeReceiver

    // /////////////////// CONSTRUCTOR ////////////////////
    constructor(
        CatalystRegistry catalystRegistry,
        ERC20Extended sand,
        AssetToken asset,
        ERC20Group gems,
        address metaTx,
        address admin,
        CatalystToken[] memory catalysts
    ) public {
        _catalystRegistry = catalystRegistry;
        _sand = sand;
        _asset = asset;
        _gems = gems;
        _admin = admin;
        _setMetaTransactionProcessor(metaTx, true);
        for (uint256 i = 0; i < catalysts.length; i++) {
            _validCatalysts[catalysts[i]] = true;
        }
    }
}
