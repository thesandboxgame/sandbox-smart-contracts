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

        require(_sand.burnFor(from, quantity * _sandFee), "cannot burn Sand");
        
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

    // function mintMultiple(
    //     address from,
    //     uint40 packId,
    //     bytes32 metadataHash,
    //     uint256[] calldata supplies,
    //     address owner,
    //     bytes calldata data,
    //     uint256 feePerCopy
    // ) external returns (uint256[] memory ids) {
    //     require(from == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
    //     require(feePerCopy == _feePerCopy, "invalid fee");
    //     uint256 totalCopies = 0;
    //     uint256 numAssetTypes = supplies.length;
    //     for (uint256 i = 0; i < numAssetTypes; i++) {
    //         totalCopies = totalCopies.add(supplies[i]);
    //     }
    //     require(_sand.transferFrom(from, _feeReceiver, totalCopies.mul(feePerCopy)), "failed to transfer SAND");
    //     return _asset.mintMultiple(from, packId, metadataHash, supplies, "", owner, data);
    // }

    // //////////////////// INTERNALS ////////////////////

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
        require(_gems.burnEachFor(from, gemIds, 1), "cannot burn gems");
    }

    function _checkAndBurnCatalyst(address from, CatalystToken catalystToken) internal {
        require(_validCatalysts[catalystToken], "invalid catalyst");
        require(catalystToken.burnFor(from, 1), "cannot burn catalyst");
    }

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
