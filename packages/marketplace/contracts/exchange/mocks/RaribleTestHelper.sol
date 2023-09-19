// SPDX-License-Identifier: MIT

pragma solidity 0.8.21;

import {LibOrderData} from "../../lib-order/LibOrderData.sol";
import {LibOrder} from "../../lib-order/LibOrder.sol";
import {LibAsset} from "../../lib-asset/LibAsset.sol";

contract RaribleTestHelper {
    function encode_SELL(LibOrderData.DataSell memory data) external pure returns (bytes memory) {
        return abi.encode(data);
    }

    function encode_BUY(LibOrderData.DataBuy memory data) external pure returns (bytes memory) {
        return abi.encode(data);
    }

    function encodeOriginFeeIntoUint(address account, uint96 value) external pure returns (uint256) {
        return (uint256(value) << 160) + uint256(uint160(account));
    }

    function hashKey(LibOrder.Order calldata order) external pure returns (bytes32) {
        return LibOrder.hashKey(order);
    }

    function hashV2(
        address maker,
        LibAsset.Asset memory makeAsset,
        LibAsset.Asset memory takeAsset,
        uint256 salt,
        bytes memory data
    ) public pure returns (bytes32) {
        return
            keccak256(
                abi.encode(maker, LibAsset.hash(makeAsset.assetType), LibAsset.hash(takeAsset.assetType), salt, data)
            );
    }
}
