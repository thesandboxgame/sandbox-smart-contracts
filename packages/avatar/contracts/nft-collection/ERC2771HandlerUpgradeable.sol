// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title ERC2771HandlerUpgradeable
 * @author The Sandbox
 * @custom:security-contact contact-blockchain@sandbox.game
 * @notice minimal ERC2771 handler to keep bytecode-size down
 * @dev based on: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.6.0/contracts/metatx/ERC2771Context.sol
 *      with an initializer for proxies and a mutable forwarder
 */
abstract contract ERC2771HandlerUpgradeable {
    struct ERC2771HandlerUpgradeableStorage {
        address trustedForwarder;
    }

    /// @custom:storage-location erc7201:thesandbox.storage.avatar.nft-collection.ERC2771HandlerUpgradeable
    bytes32 internal constant ERC2771_HANDLER_UPGRADABLE_STORAGE_LOCATION =
    0x269c7d123624135714769792dd28ef6db020f837bcb105cea22203ad17aa7000;

    function _getERC2771HandlerUpgradableStorage() private pure returns (ERC2771HandlerUpgradeableStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := ERC2771_HANDLER_UPGRADABLE_STORAGE_LOCATION
        }
    }

    /**
     * @notice emitted when the trusted forwarder is set
     * @param operator the sender of the transaction
     * @param oldForwarder the old trusted forwarder address
     * @param newForwarder the new trusted forwarder address
     */
    event TrustedForwarderSet(address indexed operator, address indexed oldForwarder, address indexed newForwarder);


    /**
     * @notice set the trusted forwarder
     * @param forwarder the new trusted forwarder address
     * @dev address(0) disables the forwarder
     */
    function _setTrustedForwarder(address forwarder) internal {
        ERC2771HandlerUpgradeableStorage storage $ = _getERC2771HandlerUpgradableStorage();
        emit TrustedForwarderSet(_msgSender(), $.trustedForwarder, forwarder);
        $.trustedForwarder = forwarder;
    }

    /**
     * @notice Returns the address of the trusted forwarder.
     * @return the trusted forwarder address
     */
    function trustedForwarder() external view virtual returns (address) {
        ERC2771HandlerUpgradeableStorage storage $ = _getERC2771HandlerUpgradableStorage();
        return $.trustedForwarder;
    }

    /**
     * @notice Indicates whether any particular address is the trusted forwarder.
     * @param forwarder the address ot the trusted forwarder to check
     * @return true if forwarder is the trusted forwarder address
     */
    function isTrustedForwarder(address forwarder) external view virtual returns (bool) {
        return _isTrustedForwarder(forwarder);
    }

    /**
     * @notice Override for `msg.sender`.
     * @return the address of the sender
     * @dev Defaults to the original `msg.sender` whenever a call is not performed by the trusted forwarder
     * or the calldata length is less than 20 bytes (an address length).
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
     * @notice Override for `msg.data`.
     * @return the message data with the address of the sender removed
     * @dev Defaults to the original `msg.data` whenever a call is not performed by the trusted forwarder
     * or the calldata length is less than 20 bytes (an address length).
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
     * @notice Indicates whether any particular address is the trusted forwarder.
     * @param forwarder the address ot the trusted forwarder to check
     * @return true if forwarder is the trusted forwarder address
     */
    function _isTrustedForwarder(address forwarder) internal view virtual returns (bool) {
        ERC2771HandlerUpgradeableStorage storage $ = _getERC2771HandlerUpgradableStorage();
        return forwarder == $.trustedForwarder;
    }

    /**
     * @notice ERC-2771 specifies the context as being a single address (20 bytes).
     */
    function _contextSuffixLength() internal view virtual returns (uint256) {
        return 20;
    }
}
