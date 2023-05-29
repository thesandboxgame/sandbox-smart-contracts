// SPDX-License-Identifier: MIT

pragma solidity 0.8.15;

import {
    ERC721EnumerableUpgradeable
} from "@openzeppelin/contracts-upgradeable-0.8.13/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";

/**
 * @title ERC721BurnMemoryEnumerableUpgradeable
 * @author qed.team x The Sandbox
 * @notice Baseline ERC721 contract to be used by the AvatarCollection contract
 * - provides the "burn memory" functionality:
 *     - keeping track of who burned what token for faster in-game gating checks
 */
contract ERC721BurnMemoryEnumerableUpgradeable is ERC721EnumerableUpgradeable {
    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/

    /// @notice tokenId to burner mapping; saves who burned a specific token
    mapping(uint256 => address) public burner;

    /// @notice burner to list of burned tokens mapping; to see what tokens who burned
    mapping(address => uint256[]) public burnedTokens;

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
    function burn(uint256 tokenId) public virtual {
        address sender = _msgSender();
        require(_isApprovedOrOwner(sender, tokenId), "ERC721: caller is not token owner or approved");
        super._burn(tokenId);
        burner[tokenId] = sender;
        burnedTokens[sender].push(tokenId);
        emit TokenBurned(tokenId, sender);
    }

    /**
     * @notice Returns the burner of the `tokenId`
     * @dev Does NOT revert if token was not burned/doesn't exist
     * @param tokenId the tokenId to be checked who burned it
     * @return the address of who burned the indicated token ID
     */
    function burnerOf(uint256 tokenId) external view returns (address) {
        return burner[tokenId];
    }

    /**
     * @notice Checks if the indicated owner had burned tokens
     * @param previousOwner the owner to check for burned tokens
     * @return if the address burned any tokens
     */
    function didBurnTokens(address previousOwner) external view returns (bool) {
        return burnedTokens[previousOwner].length != 0;
    }

    /**
     * @notice Gets the number of burned tokens by the indicated owner
     * @param previousOwner the owner to check for burned tokens
     * @return number of burned tokens by the indicated owner
     */
    function burnedTokensCount(address previousOwner) external view returns (uint256) {
        return burnedTokens[previousOwner].length;
    }

    /**
    Empty storage space in contracts for future enhancements
    ref: https://github.com/OpenZeppelin/openzeppelin-contracts-upgradeable/issues/13
     */
    uint256[50] private __gap;
}
