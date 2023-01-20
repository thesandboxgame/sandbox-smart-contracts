//SPDX-License-Identifier: MIT
// solhint-disable-next-line compiler-version
pragma solidity 0.8.2;

import {IOperatorFilterRegistry} from "../interfaces/IOperatorFilterRegistry.sol";
import "@openzeppelin/contracts-0.8/access/Ownable.sol";

contract OperatorFilterSubscription is Ownable {
    address public constant DEFAULT_SUBSCRIPTION = address(0x3cc6CddA760b79bAfa08dF41ECFA224f810dCeB6);

    IOperatorFilterRegistry public constant operatorFilterRegistry =
        IOperatorFilterRegistry(0x000000000000AAeB6D7670E522A718067333cd4E);

    constructor() Ownable() {
        if (address(operatorFilterRegistry).code.length > 0) {
            operatorFilterRegistry.registerAndSubscribe(address(this), DEFAULT_SUBSCRIPTION);
        }
    }

    function updateOperator(
        address registrant,
        address operator,
        bool filtered
    ) external {
        operatorFilterRegistry.updateOperator(registrant, operator, filtered);
    }

    function updateCodeHash(
        address registrant,
        bytes32 codeHash,
        bool filtered
    ) external {
        operatorFilterRegistry.updateCodeHash(registrant, codeHash, filtered);
    }

    function updateOperators(
        address registrant,
        address[] calldata operators,
        bool filtered
    ) external {
        operatorFilterRegistry.updateOperators(registrant, operators, filtered);
    }

    function updateCodeHashes(
        address registrant,
        bytes32[] calldata codeHashes,
        bool filtered
    ) external {
        operatorFilterRegistry.updateCodeHashes(registrant, codeHashes, filtered);
    }
}
