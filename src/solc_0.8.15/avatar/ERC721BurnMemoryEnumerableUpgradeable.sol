// SPDX-License-Identifier: MIT
pragma solidity ^0.8.15;

import { ERC721EnumerableUpgradeable, ERC721Upgradeable, IERC721Upgradeable } from "openzeppelin-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

contract ERC721BurnMemoryEnumerableUpgradeable is ERC721EnumerableUpgradeable {

    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/

    /// @notice tokenId to burner mapping; saves who burned a specific token
    mapping (uint256 => address) public burner;

    /*//////////////////////////////////////////////////////////////
                                Events
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice event emitted when a token was burned
     * @param tokenId the id of the token that was burned
     * @param burner the owner that burned the token
     */
    event TokenBurned(uint256 indexed tokenId, address indexed burner);

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Burns `tokenId`. The caller must own `tokenId` or be an approved operator.
     * @dev See {ERC721EnumerableUpgradeable-_burn}.
     * @custom:event TokenBurned
     * @param tokenId the token id to be burned
     */
     function burn(uint256 tokenId) public {
        address sender = _msgSender();
        require(_isApprovedOrOwner(sender, tokenId), "ERC721: caller is not token owner or approved");
        super._burn(tokenId);
        burner[tokenId] = sender;
        emit TokenBurned(tokenId, sender);
    }

    /**
     * @notice Returns the burner of the `tokenId`. Does NOT revert if token was not burned/ dosen't exist
     * @param tokenId the tokenId to be checked who burned it
     * @return the address of who burned the indicated token ID
     */
    function burnerOf(uint256 tokenId) external view returns (address) {
        return burner[tokenId];
    }
}
