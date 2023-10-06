// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

contract ERC1155Test is EIP712Upgradeable {
    using ECDSAUpgradeable for bytes32;

    // solhint-disable-next-line func-name-mixedcase
    function __ERC1155Test_init() external initializer {
        __EIP712_init("Mint1155", "1");
    }
}
