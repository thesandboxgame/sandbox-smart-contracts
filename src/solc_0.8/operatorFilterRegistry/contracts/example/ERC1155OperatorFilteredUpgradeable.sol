//SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "./upgradeable/MockDefaultOperatorFiltererUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract ERC1155OperatorFilteredUpgradeable is
    ERC1155Upgradeable,
    OwnableUpgradeable,
    MockDefaultOperatorFiltererUpgradeable
{
    function __ERC1155OperatorFiltered_init(string memory uri_, address _operatorFilterRegistry) public initializer {
        __ERC1155_init(uri_);
        __Ownable_init();
        __MockDefaultOperatorFilterer_init(false, _operatorFilterRegistry);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public virtual override onlyAllowedOperator(from) {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: caller is not owner nor approved"
        );
        _safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public virtual override onlyAllowedOperator(from) {
        require(
            from == _msgSender() || isApprovedForAll(from, _msgSender()),
            "ERC1155: transfer caller is not owner nor approved"
        );
        _safeBatchTransferFrom(from, to, ids, amounts, data);
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external {
        _mint(to, id, amount, data);
    }

    function setApprovalForAll(address operator, bool approved)
        public
        virtual
        override
        onlyAllowedOperatorApproval(operator)
    {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function setApprovalForAllWithOutFilter(address operator, bool approved) public virtual {
        _setApprovalForAll(_msgSender(), operator, approved);
    }

    function owner() public view override(MockOperatorFiltererUpgradeable, OwnableUpgradeable) returns (address) {
        return OwnableUpgradeable.owner();
    }
}
