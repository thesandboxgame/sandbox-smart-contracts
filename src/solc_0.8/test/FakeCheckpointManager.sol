//SPDX-License-Identifier: MIT
pragma solidity 0.8.2;

contract ICheckpointManager {
    struct HeaderBlock {
        bytes32 root;
        uint256 start;
        uint256 end;
        uint256 createdAt;
        address proposer;
    }

    /**
     * @notice mapping of checkpoint header numbers to block details
     * @dev These checkpoints are submited by plasma contracts
     */
    mapping(uint256 => HeaderBlock) public headerBlocks;
}

contract FakeCheckpointManager is ICheckpointManager {
    uint256 public currentCheckpointNumber = 0;

    function setCheckpoint(
        bytes32 rootHash,
        uint256 start,
        uint256 end
    ) public {
        HeaderBlock memory headerBlock =
            HeaderBlock({root: rootHash, start: start, end: end, createdAt: block.timestamp, proposer: msg.sender});

        currentCheckpointNumber = currentCheckpointNumber + 1;
        headerBlocks[currentCheckpointNumber] = headerBlock;
    }
}
