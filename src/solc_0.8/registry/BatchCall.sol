// SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721} from "@openzeppelin/contracts-0.8/token/ERC721/IERC721.sol";
import {Address} from "@openzeppelin/contracts-0.8/utils/Address.sol";

/// @notice A contract to batch a lot of calls so we don't get rate limited by the node
contract BatchCall {
    function ownerOf(IERC721 addr, uint256[] calldata ids) external view returns (address[] memory owners) {
        uint256 len = ids.length;
        owners = new address[](len);
        for (uint256 i; i < len; i++) {
            try addr.ownerOf(ids[i]) returns (address result) {
                owners[i] = result;
            } catch // The implementation of land ownerOf has flaws :(
            // solhint-disable no-empty-blocks
            {

            }
        }
    }

    function balanceOf(IERC721 addr, address[] calldata owners) external view returns (uint256[] memory balances) {
        uint256 len = owners.length;
        balances = new uint256[](len);
        for (uint256 i; i < len; i++) {
            balances[i] = addr.balanceOf(owners[i]);
        }
    }

    function multiStaticCall(address target, bytes[] calldata data) external view returns (bytes[] memory results) {
        require(Address.isContract(target), "call to non-contract");
        uint256 len = data.length;
        results = new bytes[](len);
        for (uint256 i = 0; i < len; i++) {
            (bool success, bytes memory returnData) = target.staticcall(data[i]);
            if (success) {
                results[i] = returnData;
            }
        }
        return results;
    }
}
