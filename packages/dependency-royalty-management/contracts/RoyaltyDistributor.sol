// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IRoyaltyManager} from "./interfaces/IRoyaltyManager.sol";
import {
    ERC165Upgradeable,
    IERC165Upgradeable
} from "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165Upgradeable.sol";

/// @title RoyaltyDistributor
/// @author The Sandbox
/// @notice Contract for distributing royalties based on the ERC2981 standard.
abstract contract RoyaltyDistributor is IERC2981Upgradeable, ERC165Upgradeable {
    event RoyaltyManagerSet(address indexed _royaltyManager);
    uint16 internal constant TOTAL_BASIS_POINTS = 10000;
    IRoyaltyManager private royaltyManager;

    // solhint-disable-next-line func-name-mixedcase
    function __RoyaltyDistributor_init(address _royaltyManager) internal onlyInitializing {
        _setRoyaltyManager(_royaltyManager);
        __ERC165_init_unchained();
    }

    /// @notice Returns how much royalty is owed and to whom based on ERC2981
    /// @dev tokenId is one of the EIP2981 args for this function can't be removed
    /// @param _salePrice the price of token on which the royalty is calculated
    /// @return receiver the receiver of royalty
    /// @return royaltyAmount the amount of royalty
    function royaltyInfo(
        uint256, /*_tokenId */
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        uint16 royaltyBps;
        (receiver, royaltyBps) = royaltyManager.getRoyaltyInfo();
        royaltyAmount = (_salePrice * royaltyBps) / TOTAL_BASIS_POINTS;
        return (receiver, royaltyAmount);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param interfaceId the interface identifier, as specified in ERC-165.
    /// @return isSupported `true` if the contract implements `id`.
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165Upgradeable, IERC165Upgradeable)
        returns (bool isSupported)
    {
        return (interfaceId == type(IERC2981Upgradeable).interfaceId || super.supportsInterface(interfaceId));
    }

    /// @notice returns the royalty manager
    /// @return royaltyManagerAddress address of royalty manager contract.
    function getRoyaltyManager() external view returns (IRoyaltyManager royaltyManagerAddress) {
        royaltyManagerAddress = royaltyManager;
    }

    /// @notice set royalty manager
    /// @param _royaltyManager address of royalty manager to set
    function _setRoyaltyManager(address _royaltyManager) internal {
        royaltyManager = IRoyaltyManager(_royaltyManager);
        emit RoyaltyManagerSet(_royaltyManager);
    }

    uint256[49] private __gap;
}
