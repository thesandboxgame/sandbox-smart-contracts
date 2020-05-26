pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;

import "./Interfaces/AssetToken.sol";
import "./Catalyst/CatalystToken.sol";
import "./contracts_common/src/BaseWithStorage/Admin.sol";


contract CatalystRegistry is Admin {
    event Minter(address newMinter);
    event CatalystApplied(uint256 assetId, address catalyst);
    event GemsSocketed(uint256 assetId, address catalyst, uint256[] gemIds);

    struct Catalyst {
        CatalystToken token;
        CatalystToken.Gem[] gems;
    }

    function setCatalyst(
        uint256 assetId,
        CatalystToken catalystToken,
        uint256[] calldata gemIds
    ) external {
        require(msg.sender == _minter, "NOT_MINTER");

        _catalysts[assetId].token = catalystToken;
        delete _catalysts[assetId].gems;
        emit CatalystApplied(assetId, address(catalystToken));
        if (gemIds.length > 0) {
            _addGems(_catalysts[assetId], gemIds);
            emit GemsSocketed(assetId, address(catalystToken), gemIds);
        }
    }

    function addGems(uint256 assetId, uint256[] calldata gemIds) external {
        require(gemIds.length > 0, "NO_GEMS_GIVEN");
        require(msg.sender == _minter, "NOT_MINTER");
        Catalyst storage catalyst = _catalysts[assetId];
        address catalystToken = address(catalyst.token);
        if (catalystToken == address(0)) {
            // copy if not set
            Catalyst storage parentCatalyst = _getCatalyst(assetId);
            catalyst.token = parentCatalyst.token;
            catalyst.gems = parentCatalyst.gems;
        }
        _addGems(catalyst, gemIds);
        emit GemsSocketed(assetId, catalystToken, gemIds);
    }

    function getCatalyst(uint256 assetId) external view returns (Catalyst memory) {
        return _getCatalyst(assetId);
    }

    function getAttributes(uint256 assetId) external view returns (CatalystToken.Attribute[] memory) {
        Catalyst memory catalyst = _catalysts[assetId];
        if (address(catalyst.token) == address(0)) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[assetId];
            }
        }

        return catalyst.token.getAttributes(catalyst.gems);
    }

    /// @notice Set the Minter that will be the only address able to create Estate
    /// @param minter address of the minter
    function setMinter(address minter) external {
        require(msg.sender == _admin, "ADMIN_NOT_AUTHORIZED");
        require(minter != _minter, "MINTER_SAME_ALREADY_SET");
        _minter = minter;
        emit Minter(minter);
    }

    /// @notice return the current minter
    function getMinter() external view returns (address) {
        return _minter;
    }

    // ///////// INTERNAL ////////////

    function _getCatalyst(uint256 assetId) internal view returns (Catalyst storage) {
        Catalyst storage catalyst = _catalysts[assetId];
        if (address(catalyst.token) == address(0)) {
            uint256 collectionId = _getCollectionId(assetId);
            if (collectionId != 0) {
                catalyst = _catalysts[assetId];
            }
        }
        return catalyst;
    }

    function _addGems(Catalyst storage catalyst, uint256[] memory gemIds) internal {
        for (uint256 i = 0; i < gemIds.length; i++) {
            catalyst.gems.push(CatalystToken.Gem({blockNumber: uint64(block.number + 1), id: uint32(gemIds[i])}));
        }
    }

    function _getCollectionId(uint256 assetId) internal view returns (uint256) {
        try _asset.collectionOf(assetId) returns (uint256 collectionId) {
            return collectionId;
        } catch {}
        return 0;
    }

    // CONSTRUCTOR ////
    constructor(AssetToken asset, address admin) public {
        _asset = asset;
        _admin = admin;
    }

    /// DATA ////////
    address _minter;
    mapping(uint256 => Catalyst) _catalysts;
    AssetToken internal immutable _asset;
}
