// SPDX-License-Identifier: MIT
/* solhint-disable func-order, code-complexity */
pragma solidity 0.8.2;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {IERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {SuperOperators} from "../common/SuperOperators.sol";

/**
 * @title ERC721BaseToken
 * @author The Sandbox
 * @notice Basic functionalities of a NFT
 * @dev ERC721 implementation that supports meta-transactions and super operators
 */
abstract contract ERC721BaseToken is ContextUpgradeable, SuperOperators, IERC721Upgradeable {
    using AddressUpgradeable for address;

    bytes4 internal constant _ERC721_RECEIVED = 0x150b7a02;
    bytes4 internal constant _ERC721_BATCH_RECEIVED = 0x4b808c46;
    bytes4 internal constant ERC165ID = 0x01ffc9a7;
    bytes4 internal constant ERC721_MANDATORY_RECEIVER = 0x5e8bf644;

    /// @notice Get the number of tokens owned by an address.
    /// @param owner The address to look for.
    /// @return The number of tokens owned by the address.
    function balanceOf(address owner) external view override returns (uint256) {
        mapping(address => uint256) storage _numNFTPerAddress = $numNFTPerAddress();
        // TODO: Remove
        require(owner != address(0), "owner is zero address");
        return _numNFTPerAddress[owner];
    }

    function numNFTPerAddress(address a) external view returns (uint256) {
        return $numNFTPerAddress()[a];
    }

    function owners(uint256 a) external view returns (uint256) {
        return $owners()[a];
    }

    function operatorsForAll(address a, address b) external view returns (bool) {
        return $operatorsForAll()[a][b];
    }

    function operators(uint256 a) external view returns (address) {
        return $operators()[a];
    }

    function _moveNumNFTPerAddress(address from, address to, uint256 numTokensTransferred) internal {
        mapping(address => uint256) storage _numNFTPerAddress = $numNFTPerAddress();
        _numNFTPerAddress[from] -= numTokensTransferred;
        _numNFTPerAddress[to] += numTokensTransferred;
    }

    function _isOperatorsForAll(address owner, address operator) internal view returns (bool) {
        return $operatorsForAll()[owner][operator];
    }

    function _setOperators(uint256 id, address operator) internal {
        $operators()[id] = operator;
    }

    function _clearOperators(uint256 id) internal {
        mapping(uint256 => address) storage _operators = $operators();
        if (_operators[id] != address(0)) _operators[id] = address(0);
    }

    function _setOwnerData(uint256 id, uint256 data) internal {
        $owners()[id] = data;
    }

    function _getOwnerAddress(uint256 id) internal view returns (address) {
        return address(uint160($owners()[id]));
    }

    function _getOwnerData(uint256 id) internal view returns (uint256) {
        return $owners()[id];
    }

    function $numNFTPerAddress() internal view virtual returns (mapping(address => uint256) storage);

    function $owners() internal view virtual returns (mapping(uint256 => uint256) storage);

    function $operators() internal view virtual returns (mapping(uint256 => address) storage);

    function $operatorsForAll() internal view virtual returns (mapping(address => mapping(address => bool)) storage);
}
