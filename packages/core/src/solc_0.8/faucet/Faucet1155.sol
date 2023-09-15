// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";
/**
 * @title ERC1155Faucet
 * @dev A smart contract for distributing ERC1155 tokens from various faucets.
 */
contract ERC1155Faucet is Ownable {
    // Events
    event Faucet(address indexed faucet, bool enabled);
    event Period(address indexed faucet, uint256 period);
    event Limit(address indexed faucet, uint256 tokenId, uint256 limit);
    event Claimed(address indexed faucet, address indexed receiver, uint256 tokenId, uint256 amount);
    event Withdrawn(address indexed faucet, address indexed receiver, uint256[] tokenIds, uint256[] amounts);

    // State variables
    mapping(address => bool) private _faucets;
    mapping(address => uint256) private _periods;
    mapping(address => mapping(uint256 => uint256)) private _limitsByTokenId;
    mapping(address => mapping(address => uint256)) private _lastTimestamps;

    IERC1155 public erc1155Token; // Address of the ERC1155 token contract

    /**
     * @dev Constructor to initialize the contract with the ERC1155 token contract address.
     * @param _erc1155Token Address of the ERC1155 token contract.
     */
    constructor(address _erc1155Token) {
        erc1155Token = IERC1155(_erc1155Token);
    }

    /**
     * @dev Modifier to check if a faucet exists.
     * @param faucet Address of the faucet to check.
     */
    modifier exists(address faucet) {
        require(_faucets[faucet], "Faucets: FAUCET_DOES_NOT_EXIST");
        _;
    }

    /**
     * @dev Add a new faucet with a period and limit for a specific token.
     * @param faucet Address of the new faucet.
     * @param period Time period (in seconds) between claims.
     * @param tokenId ID of the ERC1155 token to distribute.
     * @param limit Maximum amount of tokens that can be claimed per period.
     */
    function addFaucet(
        address faucet,
        uint256 period,
        uint256 tokenId,
        uint256 limit
    ) public onlyOwner {
        require(!_faucets[faucet], "Faucets: FAUCET_ALREADY_EXISTS");
        require(limit > 0, "Faucets: LIMIT_ZERO");
        _setFaucet(faucet);
        _setPeriod(faucet, period);
        _setLimit(faucet, tokenId, limit);
    }

    /**
     * @dev Internal function to set a faucet as enabled.
     * @param faucet Address of the faucet to enable.
     */
    function _setFaucet(address faucet) internal {
        _faucets[faucet] = true;
        emit Faucet(faucet, true);
    }

    /**
     * @dev Remove an existing faucet.
     * @param faucet Address of the faucet to remove.
     */
    function removeFaucet(address faucet) external onlyOwner exists(faucet) {
        _withdraw(faucet, _msgSender());
        delete _faucets[faucet];
        delete _periods[faucet];
        emit Faucet(faucet, false);
    }

    /**
     * @dev Set the claim period for a faucet.
     * @param faucet Address of the faucet.
     * @param period Time period (in seconds) between claims.
     */
    function setPeriod(address faucet, uint256 period) public onlyOwner exists(faucet) {
        _setPeriod(faucet, period);
    }

    /**
     * @dev Internal function to set the claim period for a faucet.
     * @param faucet Address of the faucet.
     * @param period Time period (in seconds) between claims.
     */
    function _setPeriod(address faucet, uint256 period) internal {
        _periods[faucet] = period;
        emit Period(faucet, period);
    }

    /**
     * @dev Get the claim period for a faucet.
     * @param faucet Address of the faucet.
     * @return The claim period (in seconds).
     */
    function getPeriod(address faucet) public view exists(faucet) returns (uint256) {
        return _periods[faucet];
    }

    /**
     * @dev Set the claim limit for a specific token in a faucet.
     * @param faucet Address of the faucet.
     * @param tokenId ID of the ERC1155 token.
     * @param limit Maximum amount of tokens that can be claimed per period.
     */
    function setLimit(address faucet, uint256 tokenId, uint256 limit) public onlyOwner exists(faucet) {
        _setLimit(faucet, tokenId, limit);
    }

    /**
     * @dev Internal function to set the claim limit for a specific token in a faucet.
     * @param faucet Address of the faucet.
     * @param tokenId ID of the ERC1155 token.
     * @param limit Maximum amount of tokens that can be claimed per period.
     */
    function _setLimit(address faucet, uint256 tokenId, uint256 limit) internal {
        _limitsByTokenId[faucet][tokenId] = limit;
        emit Limit(faucet, tokenId, limit);
    }

    /**
     * @dev Get the claim limit for a specific token in a faucet.
     * @param faucet Address of the faucet.
     * @param tokenId ID of the ERC1155 token.
     * @return The claim limit for the token.
     */
    function getLimit(address faucet, uint256 tokenId) public view exists(faucet) returns (uint256) {
        return _limitsByTokenId[faucet][tokenId];
    }

    /**
     * @dev Get the balance of a specific token in the faucet contract.
     * @param faucet Address of the faucet.
     * @param tokenId ID of the ERC1155 token.
     * @return The balance of the token in the faucet.
     */
    function getBalance(address faucet, uint256 tokenId) public view exists(faucet) returns (uint256) {
        return erc1155Token.balanceOf(address(this), tokenId);
    }

    /**
     * @dev Internal function to get the balance of a specific token in the faucet contract.
     * @param faucet Address of the faucet.
     * @param tokenId ID of the ERC1155 token.
     * @return The balance of the token in the faucet.
     */
    function _getBalance(address faucet, uint256 tokenId) internal view exists(faucet) returns (uint256) {
        return erc1155Token.balanceOf(address(this), tokenId);
    }

    /**
     * @dev Check if a user can claim tokens from a faucet.
     * @param faucet Address of the faucet.
     * @param walletAddress Address of the user's wallet.
     * @return A boolean indicating if the user can claim tokens.
     */
    function canClaim(address faucet, address walletAddress) external view exists(faucet) returns (bool) {
        return _canClaim(faucet, walletAddress);
    }

    /**
     * @dev Internal function to check if a user can claim tokens from a faucet.
     * @param faucet Address of the faucet.
     * @param walletAddress Address of the user's wallet.
     * @return A boolean indicating if the user can claim tokens.
     */
    function _canClaim(address faucet, address walletAddress) internal view returns (bool) {
        return _lastTimestamps[faucet][walletAddress] + _periods[faucet] < block.timestamp;
    }

    /**
     * @dev Withdraw tokens from a faucet to a receiver's address.
     * @param faucet Address of the faucet.
     * @param receiver Address of the receiver.
     * @param tokenIds Array of token IDs to withdraw.
     * @param amounts Array of token amounts to withdraw.
     */
    function withdraw(address faucet, address receiver, uint256[] memory tokenIds, uint256[] memory amounts) external onlyOwner exists(faucet) {
        _withdraw(faucet, receiver, tokenIds, amounts);
    }

    /**
     * @dev Internal function to withdraw tokens from a faucet to a receiver's address.
     * @param faucet Address of the faucet.
     * @param receiver Address of the receiver.
     * @param tokenIds Array of token IDs to withdraw.
     * @param amounts Array of token amounts to withdraw.
     */
    function _withdraw(address faucet, address receiver, uint256[] memory tokenIds, uint256[] memory amounts) internal onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 balance = _getBalance(faucet, tokenIds[i]);
            require(balance >= amounts[i], "Faucets: FAUCET_INSUFFICIENT_BALANCE");
            erc1155Token.safeTransferFrom(address(this), receiver, tokenIds[i], amounts[i], "");
        }
        emit Withdrawn(faucet, receiver, tokenIds, amounts);
    }

    /**
     * @dev Claim ERC1155 tokens from a faucet.
     * @param faucet Address of the faucet.
     * @param tokenId ID of the ERC1155 token to claim.
     * @param amount Amount of the token to claim.
     */
    function claim(address faucet, uint256 tokenId, uint256 amount) public exists(faucet) {
        require(amount <= _limitsByTokenId[faucet][tokenId], "Faucets: AMOUNT_EXCEEDED_LIMIT");
        uint256 balance = _getBalance(faucet, tokenId);
        require(balance >= amount, "Faucets: FAUCET_INSUFFICIENT_BALANCE");
        require(_canClaim(faucet, msg.sender), "Faucets: FAUCET_PERIOD_COOLDOWN");
        _lastTimestamps[faucet][msg.sender] = block.timestamp;
        erc1155Token.safeTransferFrom(address(this), msg.sender, tokenId, amount, "");
        emit Claimed(faucet, msg.sender, tokenId, amount);
    }

    /**
     * @dev Claim multiple ERC1155 tokens from a faucet in a single call.
     * @param faucets Array of faucet addresses.
     * @param tokenIds Array of token IDs to claim.
     * @param amounts Array of token amounts to claim.
     */
    function claimBatch(address[] memory faucets, uint256[] memory tokenIds, uint256[] memory amounts) public {
        require(faucets.length == tokenIds.length && faucets.length == amounts.length, "Faucets: ARRAY_LENGTH_MISMATCH");
        for (uint256 i = 0; i < faucets.length; i++) {
            claim(faucets[i], tokenIds[i], amounts[i]);
        }
    }

}
