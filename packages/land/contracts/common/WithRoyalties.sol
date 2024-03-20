//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.23;

import {IRoyaltyManager} from "@sandbox-smart-contracts/dependency-royalty-management/contracts/interfaces/IRoyaltyManager.sol";

/// @title WithRoyalties
/// @author The Sandbox
/// @notice Add royalty support to land contracts (EIP2981 implemented with our royalty manager)
contract WithRoyalties {
    event RoyaltyManagerSet(address indexed royaltyManager);

    uint16 internal constant TOTAL_BASIS_POINTS = 10000;

    struct RoyaltiesStorage {
        IRoyaltyManager _royaltyManager;
    }
    // keccak256(abi.encode(uint256(keccak256("thesandbox.storage.RoyaltiesStorage")) - 1)) & ~bytes32(uint256(0xff))
    bytes32 private constant ROYALTIES_STORAGE_LOCATION =
        0x1a6194bb08d9fddff76c6cbfbe499d387a7d0faaf411154328fd64df138f8200;

    function _getRoyaltiesStorage() private pure returns (RoyaltiesStorage storage $) {
        // solhint-disable-next-line no-inline-assembly
        assembly {
            $.slot := ROYALTIES_STORAGE_LOCATION
        }
    }

    /// @notice Returns how much royalty is owed and to whom based on ERC2981
    /// @dev tokenId is one of the EIP2981 args for this function can't be removed
    /// @param _salePrice the price of token on which the royalty is calculated
    /// @return receiver the receiver of royalty
    /// @return royaltyAmount the amount of royalty
    function royaltyInfo(
        uint256 /*_tokenId */,
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        RoyaltiesStorage storage $ = _getRoyaltiesStorage();
        uint16 royaltyBps;
        (receiver, royaltyBps) = $._royaltyManager.getRoyaltyInfo();
        royaltyAmount = (_salePrice * royaltyBps) / TOTAL_BASIS_POINTS;
        return (receiver, royaltyAmount);
    }

    /// @notice returns the royalty manager
    /// @return royaltyManagerAddress address of royalty manager contract.
    function getRoyaltyManager() external view returns (IRoyaltyManager royaltyManagerAddress) {
        RoyaltiesStorage storage $ = _getRoyaltiesStorage();
        return $._royaltyManager;
    }

    function _setRoyaltyManager(address royaltyManager) internal {
        RoyaltiesStorage storage $ = _getRoyaltiesStorage();
        $._royaltyManager = IRoyaltyManager(royaltyManager);
        emit RoyaltyManagerSet(royaltyManager);
    }
}
