//SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

/// @title IContext
/// @notice L1 Land contract doesn't use OZ context
/// @dev We use this interface to manage that because (we don't want to affect storage)
/// @dev Will be implemented in Land and PolygonLand
abstract contract IContext {
    /// @notice return the message sender (see OZ Context)
    function _msgSender() internal view virtual returns (address);
}
