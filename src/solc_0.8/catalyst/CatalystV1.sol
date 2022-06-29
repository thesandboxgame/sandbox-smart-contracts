//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "../common/interfaces/IAssetAttributesRegistry.sol";
import "../common/BaseWithStorage/ERC20/ERC20TokenUpgradeable.sol";
import "./interfaces/ICatalyst.sol";

contract CatalystV1 is ICatalyst, ERC20TokenUpgradeable {
    uint16 public override catalystId;
    uint8 internal _maxGems;
    bytes32 public constant APPROVER_ROLE = keccak256("APPROVER_ROLE");

    IAttributes internal _attributes;

    function __CatalystV1_init(
        string memory name,
        string memory symbol,
        address trustedForwarder,
        address admin,
        uint8 maxGems,
        uint16 _catalystId,
        IAttributes attributes,
        address approver
    ) public initializer {
        __ERC20TokenUpgradeable_init(name, symbol, trustedForwarder, admin);
        _maxGems = maxGems;
        catalystId = _catalystId;
        _attributes = attributes;
        _grantRole(APPROVER_ROLE, approver);
    }

    /// @notice Used by Admin to update the attributes contract.
    /// @param attributes The new attributes contract.
    function changeAttributes(IAttributes attributes) external override onlyRole(DEFAULT_ADMIN_ROLE) {
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

    /// @notice Approve `spender` to transfer `amount` tokens from `owner`.
    /// @param owner The address whose token is allowed.
    /// @param spender The address to be given rights to transfer.
    /// @param amount The number of tokens allowed.
    /// @return success Whether or not the call succeeded.
    function approveFor(
        address owner,
        address spender,
        uint256 amount
    ) external override(ERC20BaseTokenUpgradeable, ICatalyst) returns (bool success) {
        require(
            _msgSender() == owner || hasRole(SUPER_OPERATOR_ROLE, _msgSender()) || hasRole(APPROVER_ROLE, _msgSender()),
            "NOT_AUTHORIZED"
        );
        _approveFor(owner, spender, amount);
        return true;
    }

    function getDecimals() external pure override returns (uint8) {
        return ERC20BaseTokenUpgradeable.decimals();
    }
}
