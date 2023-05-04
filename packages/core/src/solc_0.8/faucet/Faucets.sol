// SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import "@openzeppelin/contracts-0.8/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

contract Faucets is Ownable {
    event Faucet(address faucet, bool enabled);
    event Period(address faucet, uint256 period);
    event Limit(address faucet, uint256 limit);
    event Claimed(address faucet, address receiver, uint256 amount);
    event Withdrawn(address faucet, address receiver, uint256 amount);

    mapping(address => bool) private _faucets;
    mapping(address => uint256) private _periods;
    mapping(address => uint256) private _limits;
    mapping(address => mapping(address => uint256)) private _lastTimestamps;

    modifier exists(address faucet) {
        require(_faucets[faucet], "Faucets: FAUCET_DOES_NOT_EXIST");
        _;
    }

    function addFaucet(
        address faucet,
        uint256 period,
        uint256 limit
    ) public onlyOwner {
        require(!_faucets[faucet], "Faucets: FAUCET_ALREADY_EXISTS");
        _setFaucet(faucet);
        _setPeriod(faucet, period);
        _setLimit(faucet, limit);
    }

    function _setFaucet(address faucet) internal {
        _faucets[faucet] = true;
        emit Faucet(faucet, true);
    }

    function removeFaucet(address faucet) external onlyOwner exists(faucet) {
        _withdraw(faucet, _msgSender());
        delete _faucets[faucet];
        delete _periods[faucet];
        delete _limits[faucet];
        emit Faucet(faucet, false);
    }

    function getFaucet(address faucet) public view returns (bool) {
        return _faucets[faucet];
    }

    function setPeriod(address faucet, uint256 period) public onlyOwner exists(faucet) {
        _setPeriod(faucet, period);
    }

    function _setPeriod(address faucet, uint256 period) internal {
        _periods[faucet] = period;
        emit Period(faucet, period);
    }

    function getPeriod(address faucet) public view exists(faucet) returns (uint256) {
        return _periods[faucet];
    }

    function setLimit(address faucet, uint256 limit) public onlyOwner exists(faucet) {
        _setLimit(faucet, limit);
    }

    function _setLimit(address faucet, uint256 limit) internal {
        _limits[faucet] = limit;
        emit Limit(faucet, limit);
    }

    function getLimit(address faucet) public view exists(faucet) returns (uint256) {
        return _limits[faucet];
    }

    function getBalance(address faucet) public view exists(faucet) returns (uint256) {
        return IERC20(faucet).balanceOf(address(this));
    }

    function _getBalance(address faucet) internal view exists(faucet) returns (uint256) {
        return IERC20(faucet).balanceOf(address(this));
    }

    function canClaim(address faucet, address walletAddress) external view exists(faucet) returns (bool) {
        return _canClaim(faucet, walletAddress);
    }

    function _canClaim(address faucet, address walletAddress) internal view returns (bool) {
        return _lastTimestamps[faucet][walletAddress] + _periods[faucet] < block.timestamp;
    }

    function withdraw(address faucet, address receiver) external onlyOwner exists(faucet) {
        _withdraw(faucet, receiver);
    }

    function _withdraw(address faucet, address receiver) internal onlyOwner {
        uint256 accountBalance = _getBalance(faucet);
        IERC20(faucet).transfer(receiver, accountBalance);
        emit Withdrawn(faucet, receiver, accountBalance);
    }

    function claimBatch(address[] calldata faucets, uint256[] calldata amounts) public {
        require(faucets.length == amounts.length, "Faucets: ARRAY_LENGTH_MISMATCH");
        for (uint256 i = 0; i < faucets.length; i++) {
            claim(faucets[i], amounts[i]);
        }
    }

    function claim(address faucet, uint256 amount) public exists(faucet) {
        require(amount <= _limits[faucet], "Faucets: AMOUNT_EXCEEDED_LIMIT");
        uint256 accountBalance = _getBalance(faucet);
        require(accountBalance >= amount, "Faucets: FAUCET_INSUFFICIENT_BALANCE");
        require(_canClaim(faucet, msg.sender), "Faucets: FAUCET_PERIOD_COOLDOWN");
        _lastTimestamps[faucet][msg.sender] = block.timestamp;
        IERC20(faucet).transfer(msg.sender, amount);
        emit Claimed(faucet, msg.sender, amount);
    }
}
