// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {IERC721ReceiverUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import {IERC721MandatoryTokenReceiver} from "../common/IERC721MandatoryTokenReceiver.sol";
import {IContext} from "./IContext.sol";
import {WithSuperOperators} from "./WithSuperOperators.sol";

/**
 * @title ERC721BaseTokenCommon
 * @author The Sandbox
 * @notice Basic functionalities of a NFT
 * @dev ERC721 implementation that supports meta-transactions and super operators
 */
abstract contract ERC721BaseTokenCommon is IContext, IERC721Upgradeable, WithSuperOperators {
    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;

    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    uint256 internal constant NOT_ADDRESS = 0xFFFFFFFFFFFFFFFFFFFFFFFF0000000000000000000000000000000000000000;
    uint256 internal constant OPERATOR_FLAG = (2 ** 255);
    uint256 internal constant NOT_OPERATOR_FLAG = OPERATOR_FLAG - 1;
    uint256 internal constant BURNED_FLAG = (2 ** 160);

    /**
     * @notice Return the internal owner data of a Land
     * @param id The id of the Land
     * @dev for debugging purposes
     */
    function getOwnerData(uint256 id) external view returns (uint256) {
        return _getOwnerData(id);
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function isApprovedForAll(address owner, address operator) external view override returns (bool) {
        return _isApprovedForAll(owner, operator);
    }

    /// @notice Check if the contract supports an interface.
    /// 0x01ffc9a7 is ERC-165.
    /// 0x80ac58cd is ERC-721
    /// @param id The id of the interface.
    /// @return Whether the interface is supported.
    function supportsInterface(bytes4 id) public pure virtual override returns (bool) {
        return id == 0x01ffc9a7 || id == 0x80ac58cd;
    }

    /// @dev Check if receiving contract accepts erc721 transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param tokenId The id of the token we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    /// @return Whether the expected value of 0x150b7a02 is returned.
    function _checkOnERC721Received(
        address operator,
        address from,
        address to,
        uint256 tokenId,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721ReceiverUpgradeable(to).onERC721Received(operator, from, tokenId, _data);
        return (retval == _ERC721_RECEIVED);
    }

    /// @dev Check if receiving contract accepts erc721 batch transfers.
    /// @param operator The address of the operator.
    /// @param from The from address, may be different from msg.sender.
    /// @param to The address we want to transfer to.
    /// @param ids The ids of the tokens we would like to transfer.
    /// @param _data Any additional data to send with the transfer.
    /// @return Whether the expected value of 0x4b808c46 is returned.
    function _checkOnERC721BatchReceived(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        bytes memory _data
    ) internal returns (bool) {
        bytes4 retval = IERC721MandatoryTokenReceiver(to).onERC721BatchReceived(operator, from, ids, _data);
        return (retval == _ERC721_BATCH_RECEIVED);
    }

    /// @dev Check if there was enough gas.
    /// @param _contract The address of the contract to check.
    /// @param interfaceId The id of the interface we want to test.
    /// @return Whether or not this check succeeded.
    function _checkInterfaceWith10000Gas(address _contract, bytes4 interfaceId) internal view returns (bool) {
        bool success;
        bool result;
        bytes memory callData = abi.encodeWithSelector(ERC165ID, interfaceId);
        // solhint-disable-next-line no-inline-assembly
        assembly {
            let call_ptr := add(0x20, callData)
            let call_size := mload(callData)
            let output := mload(0x40) // Find empty storage location using "free memory pointer"
            mstore(output, 0x0)
            success := staticcall(10000, _contract, call_ptr, call_size, output, 0x20) // 32 bytes
            result := mload(output)
        }
        // (10000 / 63) "not enough for supportsInterface(...)" // consume all gas, so caller can potentially know that there was not enough gas
        assert(gasleft() > 158);
        return success && result;
    }

    /// @notice Check if the sender approved the operator.
    /// @param owner The address of the owner.
    /// @param operator The address of the operator.
    /// @return isOperator The status of the approval.
    function _isApprovedForAll(address owner, address operator) internal view returns (bool) {
        return _isOperatorForAll(owner, operator) || _isSuperOperator(operator);
    }

    function _addNumNFTPerAddress(address who, uint256 val) internal {
        _setNumNFTPerAddress(who, _getNumNFTPerAddress(who) + val);
    }

    function _subNumNFTPerAddress(address who, uint256 val) internal {
        _setNumNFTPerAddress(who, _getNumNFTPerAddress(who) - val);
    }

    function _transferNumNFTPerAddress(address from, address to, uint256 quantity) internal virtual {
        _subNumNFTPerAddress(from, quantity);
        _addNumNFTPerAddress(to, quantity);
    }

    function _getNumNFTPerAddress(address who) internal view virtual returns (uint256);

    function _setNumNFTPerAddress(address who, uint256 val) internal virtual;

    function _getOwnerData(uint256 id) internal view virtual returns (uint256);

    function _getOwnerAddress(uint256 id) internal view virtual returns (address) {
        return address(uint160(_getOwnerData(id)));
    }

    function _setOwnerData(uint256 id, uint256 data) internal virtual;

    function _isOperatorForAll(address owner, address operator) internal view virtual returns (bool);

    function _setOperatorForAll(address owner, address operator, bool enabled) internal virtual;

    function _getOperator(uint256 id) internal view virtual returns (address);

    function _setOperator(uint256 id, address operator) internal virtual;
}
