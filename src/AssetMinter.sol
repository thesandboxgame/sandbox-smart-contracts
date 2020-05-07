pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./contracts_common/src/Interfaces/ERC20.sol";
import "./contracts_common/src/BaseWithStorage/MetaTransactionReceiver.sol";
import "./contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "./Catalyst/ERC20Group.sol";
import "./Catalyst/CatalystToken.sol";
import "./Catalyst/CatalystRegistry.sol";

contract AssetMinter is MetaTransactionReceiver {
    /// @notice mint common Asset token by paying the Sand fee
    /// @param creator address creating the Asset, need to be the tx sender or meta tx signer
    /// @param packId unused packId that will let you predict the resulting tokenId
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata
    /// @param catalystToken address of the Catalyst ERC20 token to burn
    /// @param gemIds list of gem ids to burn in the catalyst
    /// @param to address receiving the minted tokens
    /// @param data extra data
    function mint(
        address creator,
        uint40 packId,
        bytes32 metadataHash,
        CatalystToken catalystToken,
        uint256[] calldata gemIds,
        address to,
        bytes calldata data
    ) external returns (uint256) {
        require(to != address(0), "INVALID ADDRESS ZERO");
        require(creator == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
        require(_validCatalysts[catalystToken], "invalid catalyst");
        (uint8 rarity, uint16 maxGems, uint64 quantity) = catalystToken.getMintData();
        require(gemIds.length <= maxGems, "too many gems");
        require(catalystToken.burnFor(creator, 1), "cannot burn catalyst");
        require(_gems.burnEachFor(creator, gemIds, 1), "cannot burn gems");
        uint256 id = _asset.mint(creator, packId, metadataHash, quantity, rarity, to, data);
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
        uint256 id = _asset.extractERC721From(from, assetId, from);
        changeCatalyst(from, id, catalystToken, gemIds, to); 
    }

    function changeCatalyst(
        address from,
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] memory gemIds,
        address to
    ) public {
        CatalystRegistry.Catalyst memory catalyst = _catalystRegistry.getCatalyst(assetId);
        // TODO : change catalyst
        // TODO : transfer to to 
    }

    /// @notice mint multiple common Asset tokena by paying the Sand fee
    /// @param creator address creating the Asset, need to be the tx sender or meta tx signer
    /// @param packId unused packId that will let you predict the resulting tokenId
    /// @param metadataHash cidv1 ipfs hash of the folder where 0.json file contains the metadata
    /// @param supplies number of copies to mint for each Asset, cost in Sand is relative it it
    /// @param owner address receiving the minted tokens
    /// @param data extra data
    /// @param feePerCopy fee in Sand for each copies
    // function mintMultiple(
    //     address creator,
    //     uint40 packId,
    //     bytes32 metadataHash,
    //     uint256[] calldata supplies,
    //     address owner,
    //     bytes calldata data,
    //     uint256 feePerCopy
    // ) external returns (uint256[] memory ids) {
    //     require(creator == msg.sender || _metaTransactionContracts[msg.sender], "not authorized");
    //     require(feePerCopy == _feePerCopy, "invalid fee");
    //     uint256 totalCopies = 0;
    //     uint256 numAssetTypes = supplies.length;
    //     for (uint256 i = 0; i < numAssetTypes; i++) {
    //         totalCopies = totalCopies.add(supplies[i]);
    //     }
    //     require(_sand.transferFrom(creator, _feeReceiver, totalCopies.mul(feePerCopy)), "failed to transfer SAND");
    //     return _asset.mintMultiple(creator, packId, metadataHash, supplies, "", owner, data);
    // }

    // /////////////////// UTILITIES /////////////////////
    using SafeMathWithRequire for uint256;

    // //////////////////////// DATA /////////////////////
    AssetToken _asset;
    ERC20Group _gems;
    mapping(CatalystToken => bool) _validCatalysts;
    CatalystRegistry _catalystRegistry;

    // /////////////////// CONSTRUCTOR ////////////////////
    constructor(
        CatalystRegistry catalystRegistry,
        AssetToken asset,
        ERC20Group gems,
        address metaTx,
        address admin,
        CatalystToken[] memory catalysts
    ) public {
        _catalystRegistry = catalystRegistry;
        _asset = asset;
        _gems = gems;
        _admin = admin;
        _setMetaTransactionProcessor(metaTx, true);
        for (uint256 i = 0; i < catalysts.length; i++) {
            _validCatalysts[catalysts[i]] = true;
        }
    }
}
