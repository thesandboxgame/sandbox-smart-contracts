// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.15;

/// @dev minimal ERC2771 handler to keep bytecode-size down
/// based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/metatx/ERC2771Context.sol
/// with an initializer for proxies and a mutable forwarder
/// @dev same as ERC2771Handler.sol but with gap

contract ERC2771HandlerUpgradeable {
    address internal _trustedForwarder;
    uint256[49] private __gap;

    function __ERC2771Handler_initialize(address forwarder) internal {
        _trustedForwarder = forwarder;
    }

    /**
     * @dev Returns the address of the trusted forwarder.
     */
    function trustedForwarder() external view virtual returns (address) {
        return _trustedForwarder;
    }

    /**
     * @dev Indicates whether any particular address is the trusted forwarder.
     */
    function isTrustedForwarder(address forwarder) external view virtual returns (bool) {
        return _isTrustedForwarder(forwarder);
    }

    /**
     * @dev Override for `msg.sender`. Defaults to the original `msg.sender` whenever
     * a call is not performed by the trusted forwarder or the calldata length is less than
     * 20 bytes (an address length).
     */
    function _msgSender() internal view virtual returns (address) {
        uint256 calldataLength = msg.data.length;
        uint256 contextSuffixLength = _contextSuffixLength();
        if (_isTrustedForwarder(msg.sender) && calldataLength >= contextSuffixLength) {
            return address(bytes20(msg.data[calldataLength - contextSuffixLength :]));
        } else {
            return msg.sender;
        }
    }

    /**
     * @dev Override for `msg.data`. Defaults to the original `msg.data` whenever
     * a call is not performed by the trusted forwarder or the calldata length is less than
     * 20 bytes (an address length).
     */
    function _msgData() internal view virtual returns (bytes calldata) {
        uint256 calldataLength = msg.data.length;
        uint256 contextSuffixLength = _contextSuffixLength();
        if (_isTrustedForwarder(msg.sender) && calldataLength >= contextSuffixLength) {
            return msg.data[: calldataLength - contextSuffixLength];
        } else {
            return msg.data;
        }
    }

    /**
     * @dev Indicates whether any particular address is the trusted forwarder.
     */
    function _isTrustedForwarder(address forwarder) internal view virtual returns (bool) {
        return forwarder == _trustedForwarder;
    }

    /**
     * @dev ERC-2771 specifies the context as being a single address (20 bytes).
     */
    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 20;
    }
}
