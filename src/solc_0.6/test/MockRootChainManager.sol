//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.6.5;
import "./MockSandPredicate.sol";

contract MockRootChainManager {
    address internal immutable _predicateAddress;

    constructor(address predicateAddress) public {
        _predicateAddress = predicateAddress;
    }

    function depositFor(
        address user,
        address rootToken,
        bytes calldata depositData
    ) external {
        MockSandPredicate(_predicateAddress).lockTokens(msg.sender, user, rootToken, depositData);
    }
}
