// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibERC1155LazyMint} from "../erc-1155/LibERC1155LazyMint.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";

contract ERC1155Test is EIP712Upgradeable {
    using ECDSAUpgradeable for bytes32;

    // solhint-disable-next-line func-name-mixedcase
    function __ERC1155Test_init() external initializer {
        __EIP712_init("Mint1155", "1");
    }

    function recover(
        LibERC1155LazyMint.Mint1155Data memory data,
        bytes memory signature
    ) external view returns (address) {
        bytes32 structHash = LibERC1155LazyMint.hash(data);
        bytes32 hash = _hashTypedDataV4(structHash);
        return hash.recover(signature);
    }
}
