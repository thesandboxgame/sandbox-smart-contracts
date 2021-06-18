// SPDX-License-Identifier: MIT

pragma solidity 0.8.2;

import "../common/BaseWithStorage/ERC20/extensions/ERC20ExecuteExtension.sol";
import "../common/BaseWithStorage/ERC20/extensions/ERC20BasicApproveExtension.sol";
import "../common/BaseWithStorage/ERC20/ERC20BaseToken.sol";

contract SandBaseToken is ERC20BaseToken, ERC20ExecuteExtension, ERC20BasicApproveExtension {
    constructor(
        address sandAdmin,
        address executionAdmin,
        address beneficiary
    )
        ERC20BaseToken("SAND", "SAND", sandAdmin, executionAdmin) // solhint-disable-next-line no-empty-blocks
    {
        _admin = sandAdmin;
        _executionAdmin = executionAdmin;
        _mint(beneficiary, 3000000000000000000000000000);
    }

    function _addAllowanceIfNeeded(
        address owner,
        address spender,
        uint256 amountNeeded
    ) internal override(ERC20BaseToken, ERC20Internal) {
        return ERC20BaseToken._approveFor(owner, spender, amountNeeded);
    }

    function _approveFor(
        address owner,
        address spender,
        uint256 amount
    ) internal override(ERC20BaseToken, ERC20Internal) {
        return ERC20BaseToken._approveFor(owner, spender, amount);
    }

    function _transfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20BaseToken, ERC20Internal) {
        return ERC20BaseToken._transfer(from, to, amount);
    }
}
