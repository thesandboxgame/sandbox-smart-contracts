// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import {ERC721Holder} from "@openzeppelin/contracts-0.8.15/token/ERC721/utils/ERC721Holder.sol";

contract MockERC721Holder is ERC721Holder {
    bool public doReject;
    bool public doRevert;
    bool public doEmptyRevert;
    string public revertMsg;

    function setReject(bool enable) external {
        doReject = enable;
    }

    function setRevert(bool enable, string calldata _revertMsg) external {
        doRevert = enable;
        revertMsg = _revertMsg;
    }

    function setEmptyRevert(bool enable) external {
        doEmptyRevert = enable;
    }

    function onERC721Received(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public virtual override returns (bytes4) {
        if (doReject) {
            return 0;
        }
        if (doEmptyRevert) {
            // solhint-disable reason-string
            revert();
        }
        if (doRevert) {
            revert (revertMsg);
        }
        return super.onERC721Received(from, to, tokenId, data);
    }
}