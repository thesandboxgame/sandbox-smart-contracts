// SPDX-License-Identifier: MIT

pragma solidity 0.8.23;

import {IRoyaltiesProvider} from "../interfaces/IRoyaltiesProvider.sol";

abstract contract AbstractRoyaltiesMock {
    mapping(uint256 => IRoyaltiesProvider.Part[]) internal royalties;

    function _saveRoyalties(uint256 id, IRoyaltiesProvider.Part[] memory _royalties) internal {
        uint256 totalValue;
        for (uint256 i = 0; i < _royalties.length; ++i) {
            require(_royalties[i].account != address(0x0), "Recipient should be present");
            require(_royalties[i].basisPoints != 0, "basisPoints should be > 0");
            totalValue += _royalties[i].basisPoints;
            royalties[id].push(_royalties[i]);
        }
        require(totalValue < 10000, "Royalty should be < 10000");
        _onRoyaltiesSet(id, _royalties);
    }

    function _updateAccount(uint256 _id, address _from, address _to) internal {
        uint256 length = royalties[_id].length;
        for (uint256 i = 0; i < length; ++i) {
            if (royalties[_id][i].account == _from) {
                royalties[_id][i].account = payable(address(uint160(_to)));
            }
        }
    }

    function _onRoyaltiesSet(uint256 id, IRoyaltiesProvider.Part[] memory _royalties) internal virtual;
}
