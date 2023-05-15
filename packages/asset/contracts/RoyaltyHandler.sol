//SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

// initializable
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

abstract contract RoyaltyHandler is Initializable {
    address private royaltyRecipient;
    mapping(uint256 => uint256) private royaltyBpsByTokenId;

    function __RoyaltyHandler_init(
        address recipient
    ) internal onlyInitializing {
        __RoyaltyHandler_init_unchained(recipient);
    }

    function __RoyaltyHandler_init_unchained(
        address recipient
    ) internal onlyInitializing {
        royaltyRecipient = recipient;
    }

    function getRoyaltyBps(uint256 tokenId) internal view returns (uint256) {
        return royaltyBpsByTokenId[tokenId];
    }

    function setRoyaltyBps(uint256 tokenId, uint256 royaltyBps) internal {
        royaltyBpsByTokenId[tokenId] = royaltyBps;
    }

    /// @notice Implementation of EIP-2981 royalty standard
    /// @param _tokenId The token id to check
    /// @param _salePrice The sale price of the token id
    /// @return receiver The address that should receive the royalty payment
    /// @return royaltyAmount The royalty payment amount for the token id
    function royaltyInfo(
        uint256 _tokenId,
        uint256 _salePrice
    ) external view returns (address receiver, uint256 royaltyAmount) {
        uint256 tokenRoyalty = getRoyaltyBps(_tokenId);
        return (royaltyRecipient, (_salePrice * tokenRoyalty) / 10000);
    }

    /// @notice Change the royalty recipient address, limited to DEFAULT_ADMIN_ROLE only
    /// @param newRoyaltyRecipient The new royalty recipient address
    function setRoyaltyRecipient(address newRoyaltyRecipient) public {
        royaltyRecipient = newRoyaltyRecipient;
    }
}
