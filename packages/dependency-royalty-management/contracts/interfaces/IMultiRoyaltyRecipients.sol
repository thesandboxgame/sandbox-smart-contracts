// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Recipient} from "@manifoldxyz/royalty-registry-solidity/contracts/overrides/IRoyaltySplitter.sol";

/**
 * Multi-receiver EIP2981 reference override implementation
 */
interface IMultiRoyaltyRecipients is IERC165 {
    /**
     * @dev Helper function to get all recipients
     */
    function getRecipients(uint256 tokenId) external view returns (Recipient[] memory);
}
