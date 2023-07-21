// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/interfaces/IERC2981Upgradeable.sol";
import {IRoyaltyManager} from "./interfaces/IRoyaltyManager.sol";

contract RoyaltyDistributer is IERC2981Upgradeable {
    uint16 internal constant TOTAL_BASIS_POINTS = 10000;
    IRoyaltyManager public royaltyManager;

    function __RoyaltyDistributer_init(address _royaltyManager) internal {
        royaltyManager = IRoyaltyManager(_royaltyManager);
    }

    /// @notice Returns how much royalty is owed and to whom based on ERC2981
    /// @dev tokenId is one of the EIP2981 args for this function can't be removed
    /// @param _tokenId of catalyst for which the royalty is distributed
    /// @param _salePrice the price of catalyst on which the royalty is calculated
    /// @return receiver the receiver of royalty
    /// @return royaltyAmount the amount of royalty
    /* solhint-disable-next-line no-unused-vars*/
    function royaltyInfo(uint256 _tokenId, uint256 _salePrice)
        external
        view
        returns (address receiver, uint256 royaltyAmount)
    {
        uint16 royaltyBps;
        (receiver, royaltyBps) = royaltyManager.getRoyaltyInfo();
        royaltyAmount = (_salePrice * royaltyBps) / TOTAL_BASIS_POINTS;
        return (receiver, royaltyAmount);
    }

    /// @notice Query if a contract implements interface `id`.
    /// @param interfaceId the interface identifier, as specified in ERC-165.
    /// @return `true` if the contract implements `id`.
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC2981Upgradeable).interfaceId;
    }
}
