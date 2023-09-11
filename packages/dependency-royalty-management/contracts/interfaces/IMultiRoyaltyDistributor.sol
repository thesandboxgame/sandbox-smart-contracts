// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IMultiRoyaltyRecipients} from "./IMultiRoyaltyRecipients.sol";
import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";

///Multi-receiver EIP2981 reference override implementation
interface IMultiRoyaltyDistributor is IERC165, IMultiRoyaltyRecipients {
    event TokenRoyaltyRemoved(uint256 tokenId);
    event DefaultRoyaltyBpsSet(uint16 royaltyBPS);

    event DefaultRoyaltyReceiverSet(address indexed recipient);

    event RoyaltyRecipientSet(address indexed splitter, address indexed recipient);

    event TokenRoyaltySplitterSet(uint256 tokenId, address splitterAddress);

    event RoyaltyManagerSet(address indexed _royaltyManager);

    struct TokenRoyaltyConfig {
        uint256 tokenId;
        uint16 royaltyBPS;
        Recipient[] recipients;
    }

    ///@notice Set per token royalties.  Passing a recipient of address(0) will delete any existing configuration
    ///@param tokenId The ID of the token for which to set the royalties.
    ///@param recipient The address that will receive the royalties.
    ///@param creator The creator's address for the token.
    function setTokenRoyalties(
        uint256 tokenId,
        address payable recipient,
        address creator
    ) external;

    ///@notice Helper function to get all splits contracts
    ///@return an array of royalty receiver
    function getAllSplits() external view returns (address payable[] memory);
}
