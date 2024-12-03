// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import {IOperatorFilterRegistry} from "@sandbox-smart-contracts/land/contracts/interfaces/IOperatorFilterRegistry.sol";
import {WithAdmin} from "./WithAdmin.sol";
import {WithSuperOperators} from "./WithSuperOperators.sol";
import {OperatorFiltererUpgradeable} from "@sandbox-smart-contracts/land/contracts/common/OperatorFiltererUpgradeable.sol";
import {ERC721BaseToken} from "./ERC721BaseToken.sol";
import {LandBaseToken} from "./LandBaseToken.sol";
import {LandBase} from "./LandBase.sol";
import {LandStorageMixin} from "@sandbox-smart-contracts/land/contracts/mainnet/LandStorageMixin.sol";

/// @title Land Mock Contrac
contract LandMock is LandStorageMixin, LandBase {
    /// @notice Implements the Context msg sender
    /// @return the address of the message sender
    function _msgSender() internal view virtual override returns (address) {
        return msg.sender;
    }

    /// @notice get the admin address
    /// @return the admin address
    function _readAdmin() internal view override(LandStorageMixin, WithAdmin) returns (address) {
        return LandStorageMixin._readAdmin();
    }

    /// @notice set the admin address
    /// @param admin the admin address
    function _writeAdmin(address admin) internal override(LandStorageMixin, WithAdmin) {
        LandStorageMixin._writeAdmin(admin);
    }

    /// @notice check if an address is a super-operator
    /// @param superOperator the operator address to check
    /// @return true if an address is a super-operator
    function _isSuperOperator(
        address superOperator
    ) internal view override(LandStorageMixin, WithSuperOperators) returns (bool) {
        return LandStorageMixin._isSuperOperator(superOperator);
    }

    /// @notice enable an address to be super-operator
    /// @param superOperator the address to set
    /// @param enabled true enable the address, false disable it.
    function _writeSuperOperator(
        address superOperator,
        bool enabled
    ) internal override(LandStorageMixin, WithSuperOperators) {
        LandStorageMixin._writeSuperOperator(superOperator, enabled);
    }

    /// @notice get the number of nft for an address
    /// @param owner address to check
    /// @return the number of nfts
    function _readNumNFTPerAddress(
        address owner
    ) internal view override(LandStorageMixin, ERC721BaseToken) returns (uint256) {
        return LandStorageMixin._readNumNFTPerAddress(owner);
    }

    /// @notice set the number of nft for an address
    /// @param owner address to set
    /// @param quantity the number of nfts to set for the owner
    function _writeNumNFTPerAddress(
        address owner,
        uint256 quantity
    ) internal override(LandStorageMixin, ERC721BaseToken) {
        LandStorageMixin._writeNumNFTPerAddress(owner, quantity);
    }

    /// @notice get the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @return the owner data
    function _readOwnerData(
        uint256 tokenId
    ) internal view override(LandStorageMixin, ERC721BaseToken) returns (uint256) {
        return LandStorageMixin._readOwnerData(tokenId);
    }

    /// @notice sets Approvals with operator filterer check in case to test the transfer.
    /// @param operator address of the operator to be approved
    /// @param approved bool value denoting approved (true) or not Approved(false)
    function setApprovalForAllWithOutFilter(address operator, bool approved) external {
        super._setApprovalForAll(msg.sender, operator, approved);
    }

    /// @notice set the owner data, this includes: owner address, burn flag and operator flag (see: _owners declaration)
    /// @param tokenId the token Id
    /// @param data the owner data
    function _writeOwnerData(uint256 tokenId, uint256 data) internal override(LandStorageMixin, ERC721BaseToken) {
        LandStorageMixin._writeOwnerData(tokenId, data);
    }

    /// @notice check if an operator was enabled by a given owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @return true if the operator has access
    function _isOperatorForAll(
        address owner,
        address operator
    ) internal view override(LandStorageMixin, ERC721BaseToken) returns (bool) {
        return LandStorageMixin._isOperatorForAll(owner, operator);
    }

    /// @notice Let an operator to access to all the tokens of a owner
    /// @param owner that enabled the operator
    /// @param operator address to check if it was enabled
    /// @param enabled if true give access to the operator, else disable it
    function _writeOperatorForAll(
        address owner,
        address operator,
        bool enabled
    ) internal override(LandStorageMixin, ERC721BaseToken) {
        LandStorageMixin._writeOperatorForAll(owner, operator, enabled);
    }

    /// @notice get the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId The id of the token.
    /// @return the operator address
    function _readOperator(
        uint256 tokenId
    ) internal view override(LandStorageMixin, ERC721BaseToken) returns (address) {
        return LandStorageMixin._readOperator(tokenId);
    }

    /// @notice set the operator for a specific token, the operator can transfer on the owner behalf
    /// @param tokenId the id of the token.
    /// @param operator the operator address
    function _writeOperator(uint256 tokenId, address operator) internal override(LandStorageMixin, ERC721BaseToken) {
        LandStorageMixin._writeOperator(tokenId, operator);
    }

    /// @notice checks if an address is enabled as minter
    /// @param minter the address to check
    /// @return true if the address is a minter
    function _isMinter(address minter) internal view override(LandStorageMixin, LandBaseToken) returns (bool) {
        return LandStorageMixin._isMinter(minter);
    }

    /// @notice set an address as minter
    /// @param minter the address to set
    /// @param enabled true enable the address, false disable it.
    function _writeMinter(address minter, bool enabled) internal override(LandStorageMixin, LandBaseToken) {
        LandStorageMixin._writeMinter(minter, enabled);
    }

    /// @notice get the OpenSea operator filter
    /// @return the address of the OpenSea operator filter registry
    function _readOperatorFilterRegistry()
        internal
        view
        override(LandStorageMixin, OperatorFiltererUpgradeable)
        returns (IOperatorFilterRegistry)
    {
        return LandStorageMixin._readOperatorFilterRegistry();
    }

    /// @notice set the OpenSea operator filter
    /// @param registry the address of the OpenSea operator filter registry
    function _writeOperatorFilterRegistry(
        IOperatorFilterRegistry registry
    ) internal override(LandStorageMixin, OperatorFiltererUpgradeable) {
        LandStorageMixin._writeOperatorFilterRegistry(registry);
    }
}
