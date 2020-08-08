pragma solidity 0.6.5;
pragma experimental ABIEncoderV2;
import "./FeeDistributor.sol";
import "../contracts_common/src/interfaces/ERC20.sol";
import "../contracts_common/src/Libraries/SafeMathWithRequire.sol";
import "../contracts_common/src/BaseWithStorage/Ownable.sol";


contract FeeTimeVault is Ownable {
    using SafeMathWithRequire for uint256;

    FeeDistributor private _feeDistributor;
    uint256 private _lockPeriod;
    ERC20 private _token;
    // key = day number, value = accumulated fees til this day
    mapping(uint256 => uint256) private _accumulatedAmountPerDay;
    uint256 private _lastDaySaved;
    uint256 private _withdrawnAmount;
    uint256 private _startTime;
    event Sync(uint256 amount);

    constructor(uint256 lockPeriod, ERC20 token) public {
        _lockPeriod = lockPeriod;
        _token = token;
        _startTime = now;
    }

    function sync() external {
        uint256 day = ((now - _startTime) / 1 days);
        uint256 amount = _feeDistributor.withdraw(_token);
        _accumulatedAmountPerDay[day] = _accumulatedAmountPerDay[_lastDaySaved].add(amount);
        _lastDaySaved = day;
        emit Sync(amount);
    }

    function withdraw() external onlyOwner {
        uint256 day = ((now - _startTime) / 1 days);
        uint256 amount = _accumulatedAmountPerDay[day.sub(_lockPeriod)];
        uint256 withdrawnAmount = _withdrawnAmount;
        amount = amount.sub(withdrawnAmount);
        _withdrawnAmount = withdrawnAmount.add(amount);
        require(ERC20(_token).transfer(msg.sender, amount), "FEE_WITHDRAWAL_FAILED");
    }

    function setFeeDistributor(FeeDistributor feeDistributor) external onlyOwner {
        _feeDistributor = feeDistributor;
    }
}
