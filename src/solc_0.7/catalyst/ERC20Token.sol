//SPDX-License-Identifier: MIT
pragma solidity 0.7.1;

import "../common/BaseWithStorage/erc20/ERC20BaseToken.sol";
import "../common/BaseWithStorage/erc20/extensions/ERC20BasicApproveExtension.sol";
import "../Base/TheSandbox712.sol";
import "../common/BaseWithStorage/erc20/extensions/ERC677Extension.sol";
import "../common/Interfaces/ERC677Receiver.sol";

contract ERC20Token is ERC20BasicApproveExtension, ERC677Extension, TheSandbox712, ERC20BaseToken {
    mapping(address => uint256) public nonces;

    /// @notice Function to permit the expenditure of ERC20 token by a nominated spender
    /// @param owner the owner of the ERC20 tokens
    /// @param spender the nominated spender of the ERC20 tokens
    /// @param value the value (allowance) of the ERC20 tokens that the nominated spender will be allowed to spend
    /// @param deadline the deadline for granting permission to the spender
    /// @param v the final 1 byte of signature
    /// @param r the first 32 bytes of signature
    /// @param s the second 32 bytes of signature
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        require(deadline >= block.timestamp, "PAST_DEADLINE");
        bytes32 digest =
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
                )
            );
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, "INVALID_SIGNATURE");
        _approveFor(owner, spender, value);
    }

    function mint(address to, uint256 amount) external onlyAdmin {
        _mint(to, amount);
    }

    // //////////////////////// DATA /////////////////////
    bytes32 internal constant PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    // /////////////////// CONSTRUCTOR ////////////////////
    constructor(
        string memory name,
        string memory symbol,
        address admin
    )
        ERC20BaseToken(name, symbol, admin) // solhint-disable-next-line no-empty-blocks
    {}
}
