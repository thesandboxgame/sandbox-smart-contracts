//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

import {IERC721TokenReceiver} from "../common/interfaces/IERC721TokenReceiver.sol";
import {IERC721MandatoryTokenReceiver} from "../common/interfaces/IERC721MandatoryTokenReceiver.sol";
import {IERC165} from "../common/interfaces/IERC165.sol";

contract TestERC721Receiver is IERC721TokenReceiver, IERC721MandatoryTokenReceiver, IERC165 {
    bool public deny;
    bool public denyBatch;

    function setDeny(bool deny_, bool denyBatch_) external {
        deny = deny_;
        denyBatch = denyBatch_;
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external view override(IERC721MandatoryTokenReceiver, IERC721TokenReceiver) returns (bytes4) {
        if (!deny) {
            return IERC721TokenReceiver.onERC721Received.selector;
        }
        return 0;
    }

    function onERC721BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        bytes calldata /* data */
    ) external view override returns (bytes4) {
        if (!denyBatch) {
            return IERC721MandatoryTokenReceiver.onERC721BatchReceived.selector;
        }
        return 0;
    }

    function supportsInterface(bytes4 interfaceId) external pure override returns (bool) {
        return
            interfaceId == type(IERC721MandatoryTokenReceiver).interfaceId ||
            interfaceId == type(IERC721TokenReceiver).interfaceId;
    }
}
