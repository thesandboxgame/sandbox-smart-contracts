//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;
pragma experimental ABIEncoderV2;

import "./Gem.sol";
import "./CatalystToken.sol";
import "./AssetAttributesRegistry.sol";
import "../common/BaseWithStorage/WithAdmin.sol";

/// @notice Contract managing the Gems and Catalysts
/// Each Gems and Catalys must be registered here.
/// Each new Gem get assigned a new id (starting at 1)
/// Each new Catalyst get assigned a new id (starting at 1)
contract GemsCatalystsRegistry is WithAdmin {
    Gem[] internal _gems;
    CatalystToken[] internal _catalysts;

    constructor(address admin) {
        _admin = admin;
    }

    function getAttributes(
        uint16 catalystId,
        uint256 assetId,
        AssetAttributesRegistry.GemEvent[] calldata events
    ) external view returns (uint32[] memory values) {
        CatalystToken catalyst = getCatalyst(catalystId);
        require(catalyst != CatalystToken(0), "CATALYST_DOES_NOT_EXIST");
        return catalyst.getAttributes(assetId, events);
    }

    /// @notice Returns the maximum number of gems for a given catalyst
    /// @param catalystId catalyst identifier
    function getMaxGems(uint16 catalystId) external view returns (uint8) {
        CatalystToken catalyst = getCatalyst(catalystId);
        require(catalyst != CatalystToken(0), "CATALYST_DOES_NOT_EXIST");
        return catalyst.getMaxGems();
    }

    /// @notice Burns one gem unit from each gem id on behalf of a beneficiary
    /// @param from address of the beneficiary to burn on behalf of
    /// @param gemIds list of gems to burn one gem from each
    function burnDifferentGems(address from, uint16[] calldata gemIds) external {
        uint256[] memory amounts = new uint256[](gemIds.length);
        uint16[] memory gemIdsDedup = new uint16[](gemIds.length);
        for (uint256 i = 0; i < gemIds.length; i++) {
            gemIdsDedup[gemIds[i] - 1] = gemIds[i];
            amounts[gemIds[i] - 1] += 1;
        }
    }

    //input [5,2,4,1,1,4,2]
    //gemIdsDedup [1,2,0,4,5]
    //amounts     [2,2,0,2,1]
    /// @notice Burns one catalyst unit from each catalyst id on behalf of a beneficiary
    /// @param from address of the beneficiary to burn on behalf of
    /// @param catalystIds list of catalysts to burn one catalyst from each
    function burnDifferentCatalysts(address from, uint16[] calldata catalystIds) external {
        for (uint256 i = 0; i < catalystIds.length; i++) {
            burnCatalyst(from, catalystIds[i], 1);
        }
    }

    /// @notice Burns few gem units from each gem id on behalf of a beneficiary
    /// @param from address of the beneficiary to burn on behalf of
    /// @param gemIds list of gems to burn gem units from each
    /// @param amounts list of amounts of units to burn
    function batchBurnGems(
        address from,
        uint16[] calldata gemIds,
        uint256[] calldata amounts
    ) public {
        for (uint256 i = 0; i < gemIds.length; i++) {
            burnGem(from, gemIds[i], amounts[i]);
        }
    }

    /// @notice Burns few catalyst units from each catalyst id on behalf of a beneficiary
    /// @param from address of the beneficiary to burn on behalf of
    /// @param catalystIds list of catalysts to burn catalyst units from each
    /// @param amounts list of amounts of units to burn
    function batchBurnCatalysyts(
        address from,
        uint16[] calldata catalystIds,
        uint256[] calldata amounts
    ) public {
        for (uint256 i = 0; i < catalystIds.length; i++) {
            burnCatalyst(from, catalystIds[i], amounts[i]);
        }
    }

    /// @notice Adds both arrays of gems and catalysts to registry
    /// @param gems array of gems to be added
    /// @param catalysts array of catalysts to be added
    function addGemsAndCatalysts(Gem[] calldata gems, CatalystToken[] calldata catalysts) external {
        require(msg.sender == _admin, "NOT_AUTHORIZED");
        for (uint256 i = 0; i < gems.length; i++) {
            Gem gem = gems[i];
            uint16 gemId = gem.gemId();
            require(gemId == _gems.length + 1, "GEM_ID_NOT_IN_ORDER");
            _gems.push(gem);
        }

        for (uint256 i = 0; i < catalysts.length; i++) {
            CatalystToken catalyst = catalysts[i];
            uint16 catalystId = catalyst.catalystId();
            require(catalystId == _catalysts.length + 1, "CATALYST_ID_NOT_IN_ORDER");
            _catalysts.push(catalyst);
        }
    }

    function isGemExists(uint16 gemId) external view returns (bool) {
        return getGem(gemId) != Gem(0);
    }

    function isCatalystExists(uint16 catalystId) external view returns (bool) {
        return getCatalyst(catalystId) != CatalystToken(0);
    }

    function burnCatalyst(
        address from,
        uint16 catalystId,
        uint256 amount
    ) public {
        CatalystToken catalyst = getCatalyst(catalystId);
        require(catalyst != CatalystToken(0), "CATALYST_DOES_NOT_EXIST");
        catalyst.burnFor(from, amount);
    }

    function burnGem(
        address from,
        uint16 gemId,
        uint256 amount
    ) public {
        Gem gem = getGem(gemId);
        require(gem != Gem(0), "GEM_DOES_NOT_EXIST");
        gem.burnFor(from, amount);
    }

    // //////////////////// INTERNALS ////////////////////

    function getCatalyst(uint16 catalystId) internal view returns (CatalystToken) {
        if (catalystId > 0 && catalystId <= _catalysts.length) {
            return _catalysts[catalystId - 1];
        } else {
            return CatalystToken(0);
        }
    }

    function getGem(uint16 gemId) internal view returns (Gem) {
        if (gemId > 0 && gemId <= _gems.length) {
            return _gems[gemId - 1];
        } else {
            return Gem(0);
        }
    }
}
