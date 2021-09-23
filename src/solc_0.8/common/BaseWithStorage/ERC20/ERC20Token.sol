//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import "./ERC20BaseToken.sol";
import "./extensions/ERC20BasicApproveExtension.sol";
import "../WithPermit.sol";
import "../ERC677/extensions/ERC677Extension.sol";
import "../../interfaces/IERC677Receiver.sol";

contract ERC20Token is ERC20BasicApproveExtension, ERC677Extension, WithPermit, ERC20BaseToken {
    // /////////////////// CONSTRUCTOR ////////////////////
    constructor(
        string memory name,
        string memory symbol,
        address admin,
        address operator
    )
        ERC20BaseToken(name, symbol, admin, operator) // solhint-disable-next-line no-empty-blocks
    {}

    function mint(address to, uint256 amount) external onlyAdmin {
        _mint(to, amount);
    }

    /// @notice Function to permit the expenditure of ERC20 token by a nominated spender
    /// @param owner The owner of the ERC20 tokens
    /// @param spender The nominated spender of the ERC20 tokens
    /// @param value The value (allowance) of the ERC20 tokens that the nominated spender will be allowed to spend
    /// @param deadline The deadline for granting permission to the spender
    /// @param v The final 1 byte of signature
    /// @param r The first 32 bytes of signature
    /// @param s The second 32 bytes of signature
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public override {
        checkApproveFor(owner, spender, value, deadline, v, r, s);
        _approveFor(owner, spender, value);
    }
}
