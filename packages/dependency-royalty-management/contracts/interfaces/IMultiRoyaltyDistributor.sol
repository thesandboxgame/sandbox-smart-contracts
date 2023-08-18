// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IMultiRoyaltyRecipients} from "./IMultiRoyaltyRecipients.sol";
import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";

/**
 * Multi-receiver EIP2981 reference override implementation
 */
interface IMultiRoyaltyDistributor is IERC165, IMultiRoyaltyRecipients {
    event TokenRoyaltyRemoved(uint256 tokenId);
    event TokenRoyaltySet(uint256 tokenId, address recipient);
    event DefaultRoyaltyBpsSet(uint16 royaltyBPS);

    event DefaultRoyaltyReceiverSet(address recipient);

    event RoyaltyRecipientSet(address splitter, address recipient);

    struct TokenRoyaltyConfig {
        uint256 tokenId;
        uint16 royaltyBPS;
        Recipient[] recipients;
    }

    /**
     * @dev Set per token royalties.  Passing a recipient of address(0) will delete any existing configuration
     */
    function setTokenRoyalties(
        uint256 tokenId,
        address payable recipient,
        address creator
    ) external;

    /**
     * @dev Get all token royalty configurations
     */
    function getTokenRoyalties() external view returns (TokenRoyaltyConfig[] memory);

    /**
     * @dev Helper function to get all splits contracts
     */
    function getAllSplits() external view returns (address payable[] memory);
}
