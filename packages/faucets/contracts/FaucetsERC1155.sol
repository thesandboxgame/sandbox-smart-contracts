// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

/**
 * @title FaucetsERC1155
 * @dev A smart contract for distributing ERC1155 tokens from various faucets.
 * This contract allows the owner to set up multiple faucets, each with their
 * own distribution settings.
 */
contract FaucetsERC1155 is Ownable, ERC1155Holder, ReentrancyGuard {
    // Events
    event FaucetAdded(address indexed faucet, uint256 period, uint256 limit, uint256[] tokenIds);
    event TokenAdded(address indexed faucet, uint256 tokenId);
    event FaucetStatusChanged(address indexed faucet, bool enabled);
    event PeriodUpdated(address indexed faucet, uint256 period);
    event LimitUpdated(address indexed faucet, uint256 limit);
    event Claimed(address indexed faucet, address indexed receiver, uint256 tokenId, uint256 amount);
    event Withdrawn(address indexed faucet, address indexed receiver, uint256[] tokenIds, uint256[] amounts);

    /**
     * @dev Struct representing information about a faucet.
     * - isFaucet: indicates if the given address is a faucet.
     * - isEnabled: indicates if the faucet is currently active.
     * - period: time interval a user needs to wait between claims.
     * - limit: maximum amount of tokens a user can claim at once.
     * - tokenIds: list of token IDs supported by this faucet.
     * - tokenIdExists: mapping of token IDs to their existence in this faucet.
     * - lastTimestamps: mapping of last claim times for each user.
     */
    struct FaucetInfo {
        bool isFaucet;
        bool isEnabled;
        uint256 period;
        uint256 limit;
        uint256[] tokenIds;
        mapping(uint256 => bool) tokenIdExists;
        mapping(uint256 => mapping(address => uint256)) lastTimestamps;
    }

    // Mapping from faucet address to its information.
    mapping(address => FaucetInfo) private faucets;

    constructor(address owner) Ownable() {
        _transferOwnership(owner);
    }

    /**
     * @dev Gets the period of a given faucet.
     * @param faucet The address of the faucet.
     * @return The waiting period between claims for users.
     */
    function getPeriod(address faucet) external view exists(faucet) returns (uint256) {
        return faucets[faucet].period;
    }

    /**
     * @dev Sets the period of a given faucet.
     * @param faucet The address of the faucet.
     * @param newPeriod The new waiting period between claims for users.
     */
    function setPeriod(address faucet, uint256 newPeriod) external onlyOwner exists(faucet) {
        faucets[faucet].period = newPeriod;
        emit PeriodUpdated(faucet, newPeriod);
    }

    /**
     * @dev Gets the limit of a given faucet.
     * @param faucet The address of the faucet.
     * @return The maximum amount of tokens a user can claim at once.
     */
    function getLimit(address faucet) external view exists(faucet) returns (uint256) {
        return faucets[faucet].limit;
    }

    /**
     * @dev Sets the limit of a given faucet.
     * @param faucet The address of the faucet.
     * @param newLimit The new maximum amount of tokens a user can claim at once.
     */
    function setLimit(address faucet, uint256 newLimit) external onlyOwner exists(faucet) {
        require(newLimit > 0, "Faucets: LIMIT_ZERO");
        faucets[faucet].limit = newLimit;
        emit LimitUpdated(faucet, newLimit);
    }

    // Modifier to check if the faucet exists.
    modifier exists(address faucet) {
        require(faucets[faucet].isFaucet, "Faucets: FAUCET_DOES_NOT_EXIST");
        _;
    }

    /**
     * @dev Add a new faucet to the system.
     * @param faucet The address of the ERC1155 token contract to be used as faucet.
     * @param period The waiting period between claims for users.
     * @param limit The maximum amount of tokens a user can claim at once.
     * @param tokenIds List of token IDs that this faucet will distribute.
     */
    function addFaucet(address faucet, uint256 period, uint256 limit, uint256[] memory tokenIds) public onlyOwner {
        require(!faucets[faucet].isFaucet, "Faucets: FAUCET_ALREADY_EXISTS");
        require(limit > 0, "Faucets: LIMIT_ZERO");
        require(tokenIds.length > 0, "Faucets: TOKENS_CANNOT_BE_EMPTY");

        FaucetInfo storage faucetInfo = faucets[faucet];
        faucetInfo.isFaucet = true;
        faucetInfo.isEnabled = true;
        faucetInfo.period = period;
        faucetInfo.limit = limit;
        faucetInfo.tokenIds = tokenIds;

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(!faucetInfo.tokenIdExists[tokenIds[i]], "TOKEN_ALREADY_EXISTS");
            faucetInfo.tokenIdExists[tokenIds[i]] = true;
            emit TokenAdded(faucet, tokenIds[i]);
        }

        emit FaucetAdded(faucet, period, limit, tokenIds);
    }

    /**
     * @dev Removes a faucet and transfers any remaining tokens back to the owner.
     * @param faucet Address of the faucet to be removed.
     */
    function removeFaucet(address faucet) external onlyOwner exists(faucet) nonReentrant {
        FaucetInfo storage faucetInfo = faucets[faucet];

        _withdraw(faucet, owner(), faucetInfo.tokenIds);
        delete faucets[faucet];
    }

    /**
     * @dev Enable a faucet, allowing users to make claims.
     * @param faucet Address of the faucet to be enabled.
     */
    function enableFaucet(address faucet) external onlyOwner exists(faucet) {
        FaucetInfo storage faucetInfo = faucets[faucet];

        faucetInfo.isEnabled = true;
        emit FaucetStatusChanged(faucet, true);
    }

    /**
     * @dev Disable a faucet, stopping users from making claims.
     * @param faucet Address of the faucet to be disabled.
     */
    function disableFaucet(address faucet) external onlyOwner exists(faucet) {
        FaucetInfo storage faucetInfo = faucets[faucet];

        faucetInfo.isEnabled = false;
        emit FaucetStatusChanged(faucet, false);
    }

    /**
     * @dev Remove specific tokens from a faucet.
     * @param faucet Address of the faucet.
     * @param tokenIds List of token IDs to remove.
     */
    function removeTokens(address faucet, uint256[] memory tokenIds) external onlyOwner exists(faucet) nonReentrant {
        FaucetInfo storage faucetInfo = faucets[faucet];

        _withdraw(faucet, owner(), tokenIds);

        uint256[] storage currentTokenIds = faucetInfo.tokenIds;
        uint256[] memory newTokenIds = new uint256[](currentTokenIds.length - tokenIds.length);
        uint256 newIndex = 0;

        for (uint256 i = 0; i < currentTokenIds.length; i++) {
            bool shouldSkip = false;
            for (uint256 j = 0; j < tokenIds.length; j++) {
                if (currentTokenIds[i] == tokenIds[j]) {
                    shouldSkip = true;
                    break;
                }
            }
            if (!shouldSkip) {
                newTokenIds[newIndex] = currentTokenIds[i];
                newIndex++;
            }
        }

        faucetInfo.tokenIds = newTokenIds;
    }

    /**
     * @notice (Internal) Checks if the wallet address is eligible to claim the token from the faucet.
     * @dev Calculates based on the lastTimestamp and the period in the faucetInfo, whether the walletAddress can currently claim the tokenId from the faucet.
     * @param faucet The address of the faucet contract.
     * @param tokenId The ID of the token being claimed.
     * @param walletAddress The address of the wallet attempting to claim.
     * @return bool Returns true if the wallet address can claim the token, false otherwise.
     */
    function _canClaim(address faucet, uint256 tokenId, address walletAddress) internal view returns (bool) {
        FaucetInfo storage faucetInfo = faucets[faucet];
        uint256 lastTimestamp = faucetInfo.lastTimestamps[tokenId][walletAddress];
        return block.timestamp >= (lastTimestamp + faucetInfo.period);
    }

    /**
     * @notice Determines whether a wallet address can claim a token from a specific faucet.
     * @dev Calls the internal function _canClaim to get the result.
     * @param faucet The address of the faucet contract.
     * @param tokenId The ID of the token being claimed.
     * @param walletAddress The address of the wallet attempting to claim.
     * @return bool Returns true if the wallet address can claim the token, false otherwise.
     */
    function canClaim(
        address faucet,
        uint256 tokenId,
        address walletAddress
    ) external view exists(faucet) returns (bool) {
        return _canClaim(faucet, tokenId, walletAddress);
    }

    /**
     * @dev Claim tokens from a faucet.
     * @param faucet Address of the faucet to claim from.
     * @param tokenId ID of the token to be claimed.
     * @param amount Amount of tokens to be claimed.
     */
    function claim(address faucet, uint256 tokenId, uint256 amount) external exists(faucet) nonReentrant {
        FaucetInfo storage faucetInfo = faucets[faucet];
        require(faucetInfo.isEnabled, "Faucets: FAUCET_DISABLED");
        require(faucetInfo.tokenIdExists[tokenId], "Faucets: TOKEN_DOES_NOT_EXIST");
        require(amount > 0 && amount <= faucetInfo.limit, "Faucets: AMOUNT_TOO_HIGH");
        require(_canClaim(faucet, tokenId, msg.sender), "Faucets: CLAIM_PERIOD_NOT_PASSED");

        uint256 balance = IERC1155(faucet).balanceOf(address(this), tokenId);
        require(balance >= amount, "Faucets: BALANCE_IS_NOT_ENOUGH");

        faucetInfo.lastTimestamps[tokenId][msg.sender] = block.timestamp;
        IERC1155(faucet).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
        emit Claimed(faucet, msg.sender, tokenId, amount);
    }

    /**
     * @notice Function to claim multiple tokens from a single faucet.
     * @param faucet - The address of the ERC1155 contract (faucet) to claim from.
     * @param tokenIds - An array of token IDs to be claimed from the faucet.
     * @param amounts - An array of amounts of tokens to be claimed for respective token IDs.
     *
     * Emits multiple {Claimed} events for each claim.
     *
     * Requirements:
     * - The lengths of `tokenIds` and `amounts` arrays should be the same.
     * - Each tokenId must exist in the faucet.
     */
    function claimBatch(address faucet, uint256[] memory tokenIds, uint256[] memory amounts) external nonReentrant {
        require(tokenIds.length == amounts.length, "Faucets: ARRAY_LENGTH_MISMATCH");

        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            uint256 amount = amounts[i];

            FaucetInfo storage faucetInfo = faucets[faucet];
            require(faucetInfo.isEnabled, "Faucets: FAUCET_DISABLED");
            require(faucetInfo.tokenIdExists[tokenId], "Faucets: TOKEN_DOES_NOT_EXIST");
            require(amount > 0 && amount <= faucetInfo.limit, "Faucets: AMOUNT_TOO_HIGH");
            require(_canClaim(faucet, tokenId, msg.sender), "Faucets: CLAIM_PERIOD_NOT_PASSED");

            uint256 balance = IERC1155(faucet).balanceOf(address(this), tokenId);
            require(balance >= amount, "Faucets: BALANCE_IS_NOT_ENOUGH");

            faucetInfo.lastTimestamps[tokenId][msg.sender] = block.timestamp;
            IERC1155(faucet).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
            emit Claimed(faucet, msg.sender, tokenId, amount);
        }
    }

    /**
     * @notice Function to withdraw the total balance of tokens from the contract to a specified address.
     * @param faucet - The address of the ERC1155 contract (faucet) containing the tokens to be withdrawn.
     * @param receiver - The address to which the tokens will be sent.
     * @param tokenIds - An array of token IDs to be withdrawn.
     *
     * Emits a {Withdrawn} event.
     *
     * Requirements:
     * - The `tokenIds` must exist in the faucet.
     */
    function withdraw(
        address faucet,
        address receiver,
        uint256[] memory tokenIds
    ) external onlyOwner exists(faucet) nonReentrant {
        _withdraw(faucet, receiver, tokenIds);
    }

    /**
     * @notice Internal function to withdraw multiple tokens from the contract to a specified address.
     * This function is used to transfer out tokens from the faucet to either the owner or to another specified address.
     *
     * @param faucet - The address of the ERC1155 contract (faucet) containing the tokens to be withdrawn.
     * @param receiver - The address to which the tokens will be sent.
     * @param tokenIds - An array of token IDs to be withdrawn.
     *
     * Emits a {Withdrawn} event.
     *
     * Requirements:
     * - The `tokenIds` must exist in the faucet.
     */
    function _withdraw(address faucet, address receiver, uint256[] memory tokenIds) internal {
        FaucetInfo storage faucetInfo = faucets[faucet];
        uint256[] memory balances = new uint256[](tokenIds.length);

        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(faucetInfo.tokenIdExists[tokenIds[i]], "Faucets: TOKEN_DOES_NOT_EXIST");
            uint256 balance = IERC1155(faucet).balanceOf(address(this), tokenIds[i]);
            balances[i] = balance;
        }

        IERC1155(faucet).safeBatchTransferFrom(address(this), receiver, tokenIds, balances, "");
        emit Withdrawn(faucet, receiver, tokenIds, balances);
    }
}
