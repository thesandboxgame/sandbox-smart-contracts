// SPDX-License-Identifier: MIT

pragma solidity 0.8.26;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable-0.8.13/token/ERC721/ERC721Upgradeable.sol";

/**
 * @title ERC721BurnMemoryUpgradeable
 * @author qed.team x The Sandbox
 * @notice Baseline ERC721 contract to be used by the AvatarCollection contract
 * - provides the "burn memory" functionality:
 *     - keeping track of who burned what token for faster in-game gating checks
 */
abstract contract ERC721BurnMemoryUpgradeable is ERC721Upgradeable {
    /*//////////////////////////////////////////////////////////////
                           Global state variables
    //////////////////////////////////////////////////////////////*/

    /// @notice tokenId to burner mapping; saves who burned a specific token
    mapping(uint256 => address) public burner;

    /// @notice burner to list of burned tokens mapping; to see what tokens who burned
    mapping(address => uint256[]) public burnedTokens;

    /// @notice flag that gates burning
    bool public isBurnEnabled;

    /*//////////////////////////////////////////////////////////////
                                Events
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice event emitted when a token was burned
     * @param operator the sender of the transaction
     * @param tokenId the id of the token that was burned
     * @param burner the owner that burned the token
     */
    event TokenBurned(address indexed operator, uint256 indexed tokenId, address indexed burner);

    /**
     * @notice event emitted when token burning was enabled
     * @param operator the sender of the transaction
     */
    event TokenBurningEnabled(address indexed operator);

    /**
     * @notice event emitted when token burning was disabled
     * @param operator the sender of the transaction
     */
    event TokenBurningDisabled(address indexed operator);

    /*//////////////////////////////////////////////////////////////
                    External and public functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice enables burning of tokens
     * @dev must be inherited if access control is to be added
     *      reverts if burning already enabled
     * @custom:event TokenBurningEnabled
     */
    function _enableBurning() internal {
        require(!isBurnEnabled, "Burning already enabled");
        isBurnEnabled = true;

        emit TokenBurningEnabled(_msgSender());
    }

    /**
     * @notice disables burning of tokens
     * @dev must be inherited if access control is to be added
     *      reverts if burning already disabled
     * @custom:event TokenBurningDisabled
     */
    function _disableBurning() internal {
        require(isBurnEnabled, "Burning already disabled");
        isBurnEnabled = false;

        emit TokenBurningDisabled(_msgSender());
    }

    /**
     * @notice Burns `tokenId`. The caller must own `tokenId` or be an approved operator.
     * @dev See {ERC721EnumerableUpgradeable-_burn}.
     *      Reverts if burning is not enabled
     * @custom:event TokenBurned
     * @param tokenId the token id to be burned
     */
    function _burn(uint256 tokenId) internal override virtual {
        require(isBurnEnabled, "Burning is not enabled");
        address sender = _msgSender();
        address owner = ERC721Upgradeable.ownerOf(tokenId);
        require(_isApprovedOrOwner(sender, tokenId), "ERC721: caller is not token owner or approved");
        super._burn(tokenId);
        burner[tokenId] = sender;
        // @dev TODO: if we don't remove this code, check if we want sender or owner.
        burnedTokens[sender].push(tokenId);
        emit TokenBurned(_msgSender(), tokenId, owner);
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
