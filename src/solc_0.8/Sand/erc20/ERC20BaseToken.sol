// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../../common/interfaces/IERC20.sol";
import "../../common/BaseWithStorage/WithSuperOperators.sol";
import "./ERC20BasicApproveExtension.sol";
import "./ERC20ExecuteExtension.sol";

contract ERC20BaseToken is WithSuperOperators, IERC20, ERC20BasicApproveExtension, ERC20ExecuteExtension {
    uint256 internal _totalSupply;
    mapping(address => uint256) internal _balances;
    mapping(address => mapping(address => uint256)) internal _allowances;

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address owner) public view override returns (uint256) {
        return _balances[owner];
    }

    function allowance(address owner, address spender) public view override returns (uint256 remaining) {
        return _allowances[owner][spender];
    }

    function decimals() public view returns (uint8) {
        return uint8(18);
    }

    function transfer(address to, uint256 amount) public override returns (bool success) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool success) {
        if (msg.sender != from && !_superOperators[msg.sender]) {
            uint256 currentAllowance = _allowances[from][msg.sender];
            if (currentAllowance != (2**256) - 1) {
                // save gas when allowance is maximal by not reducing it (see https://github.com/ethereum/EIPs/issues/717)
                require(currentAllowance >= amount, "Not enough funds allowed");
                _allowances[from][msg.sender] = currentAllowance - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    function burn(uint256 amount) external returns (bool) {
        _burn(msg.sender, amount);
        return true;
    }

    function burnFor(address owner, uint256 amount) external returns (bool) {
        _burn(owner, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public override returns (bool success) {
        _approveFor(msg.sender, spender, amount);
        return true;
    }

    function approveFor(
        address owner,
        address spender,
        uint256 amount
    ) public returns (bool success) {
        require(msg.sender == owner || _superOperators[msg.sender], "msg.sender != owner && !superOperator");
        _approveFor(owner, spender, amount);
        return true;
    }

    function addAllowanceIfNeeded(
        address owner,
        address spender,
        uint256 amountNeeded
    ) public returns (bool success) {
        require(msg.sender == owner || _superOperators[msg.sender], "msg.sender != owner && !superOperator");
        _addAllowanceIfNeeded(owner, spender, amountNeeded);
        return true;
    }

    function _addAllowanceIfNeeded(
        address owner,
        address spender,
        uint256 amountNeeded
    ) internal override(ERC20BasicApproveExtension, ERC20ExecuteExtension) {
        if (amountNeeded > 0 && !isSuperOperator(spender)) {
            uint256 currentAllowance = _allowances[owner][spender];
            if (currentAllowance < amountNeeded) {
                _approveFor(owner, spender, amountNeeded);
            }
        }
    }

    function _approveFor(
        address owner,
        address spender,
        uint256 amount
    ) internal override {
        require(owner != address(0) && spender != address(0), "Cannot approve with 0x0");
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        require(to != address(0), "Cannot send to 0x0");
        uint256 currentBalance = _balances[from];
        require(currentBalance >= amount, "not enough fund");
        _balances[from] = currentBalance - amount;
        _balances[to] += amount;
        emit Transfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "Cannot mint to 0x0");
        require(amount > 0, "cannot mint 0 tokens");
        uint256 currentTotalSupply = _totalSupply;
        uint256 newTotalSupply = currentTotalSupply + amount;
        require(newTotalSupply > currentTotalSupply, "overflow");
        _totalSupply = newTotalSupply;
        _balances[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal {
        require(amount > 0, "cannot burn 0 tokens");
        if (msg.sender != from && !_superOperators[msg.sender]) {
            uint256 currentAllowance = _allowances[from][msg.sender];
            require(currentAllowance >= amount, "Not enough funds allowed");
            if (currentAllowance != (2**256) - 1) {
                // save gas when allowance is maximal by not reducing it (see https://github.com/ethereum/EIPs/issues/717)
                _allowances[from][msg.sender] = currentAllowance - amount;
            }
        }

        uint256 currentBalance = _balances[from];
        require(currentBalance >= amount, "Not enough funds");
        _balances[from] = currentBalance - amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}
