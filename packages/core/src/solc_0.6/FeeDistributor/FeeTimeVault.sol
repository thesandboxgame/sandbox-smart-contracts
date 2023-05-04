pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;
import "./FeeDistributor.sol";
import "../common/Libraries/SafeMathWithRequire.sol";
import "../common/BaseWithStorage/Ownable.sol";
import "@openzeppelin/contracts-0.6/token/ERC20/SafeERC20.sol";

/// @title Fee Time Vault
/// @notice Holds tokens collected from fees in a locked state for a certain period of time
contract FeeTimeVault is Ownable {
    using SafeERC20 for IERC20;
    mapping(uint256 => uint256) public accumulatedAmountPerDay;
    FeeDistributor public feeDistributor;

    /// @notice Updates the total amount of fees collected alongside with the due date
    function sync() external returns (uint256) {
        uint256 timestamp = now;
        uint256 day = ((timestamp - _startTime) / 1 days);
        uint256 amount = feeDistributor.withdraw(_sandToken, address(this));
        accumulatedAmountPerDay[day] = accumulatedAmountPerDay[_lastDaySaved].add(amount);
        _lastDaySaved = day;
        return amount;
    }

    /// @notice Enables fee holder to withdraw its share after lock period expired
    /// @param beneficiary the address that will receive fees
    function withdraw(address payable beneficiary) external onlyOwner returns (uint256) {
        uint256 day = ((now - _startTime) / 1 days);
        uint256 lockPeriod = _lockPeriod;
        uint256 amount = lockPeriod > day ? 0 : accumulatedAmountPerDay[day - lockPeriod];
        if (amount != 0) {
            uint256 withdrawnAmount = _withdrawnAmount;
            amount = amount.sub(withdrawnAmount);
            _withdrawnAmount = withdrawnAmount.add(amount);
            _sandToken.safeTransfer(beneficiary, amount);
        }
        return amount;
    }

    /// @notice Enables fee holder to withdraw token fees with no time-lock for tokens other than SAND
    /// @param token the token that fees are collected in
    /// @param beneficiary the address that will receive fees
    function withdrawNoTimeLock(IERC20 token, address payable beneficiary) external onlyOwner returns (uint256) {
        require(token != _sandToken, "SAND_TOKEN_WITHDRWAL_NOT_ALLOWED");
        uint256 amount = feeDistributor.withdraw(token, beneficiary);
        return amount;
    }

    function setFeeDistributor(FeeDistributor _feeDistributor) external onlyOwner {
        require(address(feeDistributor) == address(0), "FEE_DISTRIBUTOR_ALREADY_SET");
        require(address(_feeDistributor) != address(0), "FEE_DISTRIBUTOR_ZERO_ADDRESS");
        feeDistributor = _feeDistributor;
    }

    receive() external payable {}

    // /////////////////// UTILITIES /////////////////////
    using SafeMathWithRequire for uint256;
    // //////////////////////// DATA /////////////////////

    uint256 private _lockPeriod;
    IERC20 private _sandToken;
    uint256 private _lastDaySaved;
    uint256 private _withdrawnAmount;
    uint256 private _startTime;

    // /////////////////// CONSTRUCTOR ////////////////////
    /// @param lockPeriod lockPeriod measured in days, e.g. lockPeriod = 10 => 10 days
    /// @param token sand token contract address
    /// @param owner the account that can make a withdrawal
    constructor(
        uint256 lockPeriod,
        IERC20 token,
        address payable owner
    ) public Ownable(owner) {
        _lockPeriod = lockPeriod;
        _sandToken = token;
        _startTime = now;
    }
}
