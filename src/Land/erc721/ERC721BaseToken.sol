pragma solidity 0.5.9;

import {
    ERC721Events
} from "../../../contracts_common/src/Interfaces/ERC721Events.sol";

contract ERC721BaseToken is
    ERC721Events /*ERC721*/
{
    mapping(address => uint256) numNFTPerAddress;
    mapping(uint256 => address) owners;
    mapping(address => mapping(address => bool)) operatorsForAll;
    mapping(uint256 => address) operators;
    mapping(uint256 => string) public metadataURIs;
    address metaTxContract;

    constructor(address _metaTxContract) public {
        initERC721BaseToken(_metaTxContract);
    }

    function initERC721BaseToken(address _metaTxContract) public {
        metaTxContract = _metaTxContract;
    }

    function _transferFrom(address _from, address _to, uint256 _id) internal {
        require(_to != address(0), "Invalid to address");
        if (_from != msg.sender && msg.sender != metaTxContract) {
            require(
                operatorsForAll[_from][msg.sender] ||
                    operators[_id] == msg.sender,
                "Operator not approved"
            );
        }

        numNFTPerAddress[_from]--;
        numNFTPerAddress[_to]++;
        owners[_id] = _to;
        operators[_id] = address(0);
        emit Transfer(_from, _to, _id);
    }

    function balanceOf(address _owner)
        external
        view
        returns (uint256 _balance)
    {
        return numNFTPerAddress[_owner];
    }
    function ownerOf(uint256 _id) external view returns (address _owner) {
        return owners[_id];
    }

    function approveFor(address _sender, address _operator, uint256 _id)
        external
    {
        require(
            msg.sender == _sender || msg.sender == metaTxContract,
            "only msg.sender or metaTxContract can act on behalf of sender"
        );
        require(owners[_id] == _sender, "only owner can change operator");
        operators[_id] = _operator;
        emit Approval(_sender, _operator, _id);
    }
    function approve(address _operator, uint256 _id) external {
        require(owners[_id] == msg.sender, "only owner can change operator");
        operators[_id] = _operator;
        emit Approval(msg.sender, _operator, _id);
    }
    function getApproved(uint256 _id)
        external
        view
        returns (address _operator)
    {
        return operators[_id];
    }
    function transferFrom(address _from, address _to, uint256 _id) external {
        require(owners[_id] != address(0), "not an NFT");
        require(owners[_id] == _from, "only owner can change operator");
        _transferFrom(_from, _to, _id);
    }
    /////////////////////////////////////////////////////////////////////////////////////////////////////
    function name() external pure returns (string memory _name) {
        return "SANDBOX LAND";
    }
    function symbol() external pure returns (string memory _symbol) {
        return "SLD"; // TODO define symbol
    }
    function tokenURI(uint256 _id) public view returns (string memory) {
        return string(metadataURIs[_id]);
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    function supportsInterface(bytes4) external view returns (bool) {
        // TODO _interfaceId)
        return true; // TODO
    }

    // Operators /////////////////////////////////////////////////////////////////////////////////////

    function setApprovalForAllFor(
        address _sender,
        address _operator,
        bool _approved
    ) external {
        require(
            msg.sender == _sender || msg.sender == metaTxContract,
            "only msg.sender or metaTxContract can act on behalf of sender"
        );
        _setApprovalForAll(_sender, _operator, _approved);
    }
    function setApprovalForAll(address _operator, bool _approved) external {
        _setApprovalForAll(msg.sender, _operator, _approved);
    }
    function _setApprovalForAll(
        address _sender,
        address _operator,
        bool _approved
    ) internal {
        operatorsForAll[_sender][_operator] = _approved;
        emit ApprovalForAll(_sender, _operator, _approved);
    }
    function isApprovedForAll(address _owner, address _operator)
        external
        view
        returns (bool isOperator)
    {
        return operatorsForAll[_owner][_operator];
    }
}
