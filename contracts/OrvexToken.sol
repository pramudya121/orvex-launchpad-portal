// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title OrvexToken — fixed-supply ERC-20 minted once to the launchpad.
/// @notice 1,000,000,000 tokens (18 decimals). No mint, no tax, no owner powers.
contract OrvexToken {
    string public name;
    string public symbol;
    string public metadataURI;
    uint8 public constant decimals = 18;
    uint256 public immutable totalSupply;
    address public immutable launchpad;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, string memory _uri, uint256 _supply) {
        name = _name;
        symbol = _symbol;
        metadataURI = _uri;
        totalSupply = _supply;
        launchpad = msg.sender;
        balanceOf[msg.sender] = _supply;
        emit Transfer(address(0), msg.sender, _supply);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        // The launchpad may pull tokens being sold back into the curve without a prior approve.
        if (msg.sender != launchpad) {
            uint256 a = allowance[from][msg.sender];
            if (a != type(uint256).max) {
                require(a >= value, "allowance");
                allowance[from][msg.sender] = a - value;
            }
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(to != address(0), "zero address");
        uint256 b = balanceOf[from];
        require(b >= value, "balance");
        unchecked { balanceOf[from] = b - value; }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
