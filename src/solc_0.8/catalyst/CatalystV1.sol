//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/interfaces/IAssetAttributesRegistry.sol";
//import "../common/BaseWithStorage/ERC20/ERC20Token.sol";
import "../common/BaseWithStorage/ERC20/ERC20UpgradableToken.sol";
import "./interfaces//ICatalyst.sol";

contract CatalystV1 is ICatalyst, ERC20UpgradableToken {
    uint16 public override catalystId;
    uint8 internal _maxGems;

    IAttributes internal _attributes;

    function initialize(
        string memory name,
        string memory symbol,
        address admin,
        uint8 maxGems,
        uint16 _catalystId,
        IAttributes attributes,
        address operator
    ) public initializer {
        initV1(name, symbol, admin, operator);
        _maxGems = maxGems;
        catalystId = _catalystId;
        _attributes = attributes;
    }

    /// @notice Used by Admin to update the attributes contract.
    /// @param attributes The new attributes contract.
    function changeAttributes(IAttributes attributes) external override onlyAdmin {
        _attributes = attributes;
    }

    /// @notice Get the value of _maxGems(the max number of gems that can be embeded in this type of catalyst).
    /// @return The value of _maxGems.
    function getMaxGems() external view override returns (uint8) {
        return _maxGems;
    }

    /// @notice Get the attributes for each gem in an asset.
    /// See DefaultAttributes.getAttributes for more.
    /// @return values An array of values representing the "level" of each gem. ie: Power=14, speed=45, etc...
    function getAttributes(uint256 assetId, IAssetAttributesRegistry.GemEvent[] calldata events)
        external
        view
        override
        returns (uint32[] memory values)
    {
        return _attributes.getAttributes(assetId, events);
    }
}
