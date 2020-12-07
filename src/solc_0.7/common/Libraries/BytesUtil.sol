//SPDX-License-Identifier: MIT
pragma solidity 0.7.5;

library BytesUtil {
    function doFirstParamEqualsAddress(bytes memory data, address _address) internal pure returns (bool) {
        if (data.length < (36 + 32)) {
            return false;
        }
        uint256 value;
        // solhint-disable-next-line no-inline-assembly
        assembly {
            value := mload(add(data, 36))
        }
        return value == uint256(_address);
    }
}
