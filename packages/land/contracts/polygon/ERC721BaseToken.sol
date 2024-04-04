//SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC721BaseTokenCommon} from "../common/ERC721BaseTokenCommon.sol";

/// @title ERC721BaseToken
/// @author The Sandbox
/// @notice Basic functionalities of a NFT
/// @dev ERC721 implementation that supports meta-transactions and super operators
abstract contract ERC721BaseToken is ERC721BaseTokenCommon {
    using AddressUpgradeable for address;

    /// @notice Transfer a token between 2 addresses letting the receiver know of the transfer.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    function safeTransferFrom(address from, address to, uint256 id) public virtual override {
        safeTransferFrom(from, to, id, "");
    }

    /// @notice Transfer many tokens between 2 addresses.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function batchTransferFrom(address from, address to, uint256[] calldata ids, bytes calldata data) public virtual {
        _batchTransferFrom(from, to, ids, data, false);
    }

    /// @notice Transfer many tokens between 2 addresses, while
    /// ensuring the receiving contract has a receiver method.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param ids The ids of the tokens.
    /// @param data Additional data.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        bytes calldata data
    ) external virtual {
        _batchTransferFrom(from, to, ids, data, true);
    }

    /// @notice Transfer a token between 2 addresses letting the receiver knows of the transfer.
    /// @param from The sender of the token.
    /// @param to The recipient of the token.
    /// @param id The id of the token.
    /// @param data Additional data.
    function safeTransferFrom(address from, address to, uint256 id, bytes memory data) public virtual override {
        _transferFrom(from, to, id);
        if (to.isContract()) {
            require(_checkOnERC721Received(_msgSender(), from, to, id, data), "ERC721_TRANSFER_REJECTED");
        }
    }

    /// @dev See batchTransferFrom.
    function _batchTransferFrom(address from, address to, uint256[] memory ids, bytes memory data, bool safe) internal {
        address msgSender = _msgSender();
        bool authorized = msgSender == from || _isApprovedForAll(from, msgSender);

        require(from != address(0), "NOT_FROM_ZEROADDRESS");
        require(to != address(0), "NOT_TO_ZEROADDRESS");

        uint256 numTokens = ids.length;
        for (uint256 i = 0; i < numTokens; i++) {
            uint256 id = ids[i];
            (address owner, bool operatorEnabled) = _ownerAndOperatorEnabledOf(id);
            require(owner == from, "BATCHTRANSFERFROM_NOT_OWNER");
            require(authorized || (operatorEnabled && _getOperator(id) == msgSender), "NOT_AUTHORIZED");
            _updateOwnerData(id, to, false);
            emit Transfer(from, to, id);
        }
        if (from != to) {
            _transferNumNFTPerAddress(from, to, numTokens);
        }

        if (to.isContract()) {
            if (_checkInterfaceWith10000Gas(to, ERC721_MANDATORY_RECEIVER)) {
                require(_checkOnERC721BatchReceived(msgSender, from, to, ids, data), "ERC721_BATCH_RECEIVED_REJECTED");
            } else if (safe) {
                for (uint256 i = 0; i < numTokens; i++) {
                    require(_checkOnERC721Received(msgSender, from, to, ids[i], data), "ERC721_RECEIVED_REJECTED");
                }
            }
        }
    }
}
