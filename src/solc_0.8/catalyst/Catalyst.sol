//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;
pragma experimental ABIEncoderV2;

import "../common/interfaces/IAssetAttributesRegistry.sol";
import "@openzeppelin/contracts-0.8/access/AccessControl.sol";
//import "../common/BaseWithStorage/ERC20/ERC20Token.sol";
//import "@openzeppelin/contracts-0.8/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-0.8/token/ERC20/extensions/ERC20Burnable.sol";
import "../common/interfaces/IAttributes.sol";

contract Catalyst is ERC20Burnable, IAttributes, AccessControl {
    uint16 public immutable catalystId;
    uint8 internal immutable _maxGems;

    IAttributes internal _attributes;

    constructor(
        string memory name,
        string memory symbol,
        address admin,
        uint8 maxGems,
        uint16 _catalystId,
        IAttributes attributes,
        address operator
    )
        ERC20(
            name,
            symbol /* , admin, operator */
        )
    {
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _maxGems = maxGems;
        catalystId = _catalystId;
        _attributes = attributes;
    }

    /// @notice Used by Admin to update the attributes contract.
    /// @param attributes The new attributes contract.
    function changeAttributes(
        IAttributes attributes /* onlyAdmin */
    ) external {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "NOT_AUTHORIZED");
        _attributes = attributes;
    }

    /// @notice Get the value of _maxGems(the max number of gems that can be embeded in this type of catalyst).
    /// @return The value of _maxGems.
    function getMaxGems() external view returns (uint8) {
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
