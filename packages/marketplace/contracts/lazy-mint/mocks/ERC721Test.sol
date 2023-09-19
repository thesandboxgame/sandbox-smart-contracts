// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibERC721LazyMint} from "../erc-721/LibERC721LazyMint.sol";
import {EIP712Upgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

contract ERC721Test is EIP712Upgradeable {
    using ECDSAUpgradeable for bytes32;

    function __ERC721Test_init() external initializer {
        __EIP712_init("Mint721", "1");
    }

    function recover(
        LibERC721LazyMint.Mint721Data memory data,
        bytes memory signature
    ) external view returns (address) {
        bytes32 structHash = LibERC721LazyMint.hash(data);
        bytes32 hash = _hashTypedDataV4(structHash);
        return hash.recover(signature);
    }
}
