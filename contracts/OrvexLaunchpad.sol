// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {OrvexToken} from "./OrvexToken.sol";

/// @title OrvexLaunchpad — factory + constant-product bonding curve (pump.fun style)
/// @notice Mirrors src/lib/curve.ts exactly:
///   virtual reserves 30 zkLTC / 1,073,000,000 tokens, 1% fee,
///   800M tokens sold on the curve, then the token graduates and the
///   200M reserve + raised zkLTC are released for DEX liquidity.
contract OrvexLaunchpad {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 ether;
    uint256 public constant CURVE_SUPPLY = 800_000_000 ether;
    uint256 public constant INIT_VIRTUAL_BASE = 30 ether;
    uint256 public constant INIT_VIRTUAL_TOKEN = 1_073_000_000 ether;
    uint256 public constant FEE_BPS = 100; // 1%

    struct Curve {
        address creator;
        uint256 virtualBase;
        uint256 virtualToken;
        uint256 tokensSold;
        uint256 realBase;
        bool graduated;
    }

    address public owner;
    address public feeRecipient;
    address public migrator; // receives liquidity on graduation
    uint256 public createFee;
    mapping(address => Curve) public curves;
    address[] public allTokens;
    bool private locked;

    event TokenCreated(address indexed token, address indexed creator, string name, string symbol, string uri);
    event Trade(
        address indexed token, address indexed trader, bool isBuy,
        uint256 baseAmount, uint256 tokenAmount,
        uint256 virtualBase, uint256 virtualToken, uint256 tokensSold, uint256 realBase
    );
    event Graduated(address indexed token, uint256 baseLiquidity, uint256 tokenLiquidity);

    modifier nonReentrant() { require(!locked, "reentrancy"); locked = true; _; locked = false; }
    modifier onlyOwner() { require(msg.sender == owner, "owner"); _; }

    constructor(address _feeRecipient, address _migrator) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
        migrator = _migrator;
    }

    // ---------------- factory ----------------

    /// @notice Deploys a token and optionally performs a dev buy with msg.value - createFee.
    function createToken(string calldata name, string calldata symbol, string calldata uri, uint256 minTokensOut)
        external payable nonReentrant returns (address token)
    {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "name");
        require(bytes(symbol).length > 0 && bytes(symbol).length <= 10, "symbol");
        require(msg.value >= createFee, "fee");
        token = address(new OrvexToken(name, symbol, uri, TOTAL_SUPPLY));
        curves[token] = Curve(msg.sender, INIT_VIRTUAL_BASE, INIT_VIRTUAL_TOKEN, 0, 0, false);
        allTokens.push(token);
        emit TokenCreated(token, msg.sender, name, symbol, uri);
        if (createFee > 0) _send(feeRecipient, createFee);
        uint256 dev = msg.value - createFee;
        if (dev > 0) _buy(token, dev, minTokensOut);
    }

    // ---------------- trading ----------------

    function buy(address token, uint256 minTokensOut) external payable nonReentrant {
        _buy(token, msg.value, minTokensOut);
    }

    function sell(address token, uint256 tokensIn, uint256 minBaseOut) external nonReentrant {
        Curve storage c = curves[token];
        require(c.virtualBase > 0, "unknown token");
        require(!c.graduated, "graduated");
        require(tokensIn > 0 && tokensIn <= c.tokensSold, "amount");
        uint256 k = c.virtualBase * c.virtualToken;
        uint256 gross = c.virtualBase - k / (c.virtualToken + tokensIn);
        if (gross > c.realBase) gross = c.realBase;
        uint256 fee = gross * FEE_BPS / 10_000;
        uint256 out = gross - fee;
        require(out >= minBaseOut, "slippage");

        OrvexToken(token).transferFrom(msg.sender, address(this), tokensIn);
        c.virtualBase -= gross;
        c.virtualToken += tokensIn;
        c.tokensSold -= tokensIn;
        c.realBase -= gross;

        emit Trade(token, msg.sender, false, out, tokensIn, c.virtualBase, c.virtualToken, c.tokensSold, c.realBase);
        _send(feeRecipient, fee);
        _send(msg.sender, out);
    }

    function _buy(address token, uint256 baseIn, uint256 minTokensOut) internal {
        Curve storage c = curves[token];
        require(c.virtualBase > 0, "unknown token");
        require(!c.graduated, "graduated");
        require(baseIn > 0, "amount");
        uint256 remaining = CURVE_SUPPLY - c.tokensSold;
        uint256 k = c.virtualBase * c.virtualToken;

        uint256 net = baseIn * (10_000 - FEE_BPS) / 10_000;
        uint256 tokensOut = c.virtualToken - k / (c.virtualBase + net);
        uint256 refund;
        if (tokensOut >= remaining) {
            tokensOut = remaining;
            net = k / (c.virtualToken - tokensOut) - c.virtualBase + 1;
            uint256 needed = net * 10_000 / (10_000 - FEE_BPS) + 1;
            refund = baseIn > needed ? baseIn - needed : 0;
        }
        require(tokensOut >= minTokensOut, "slippage");
        uint256 fee = baseIn - refund - net;

        c.virtualBase += net;
        c.virtualToken -= tokensOut;
        c.tokensSold += tokensOut;
        c.realBase += net;

        OrvexToken(token).transfer(msg.sender, tokensOut);
        emit Trade(token, msg.sender, true, baseIn - refund, tokensOut, c.virtualBase, c.virtualToken, c.tokensSold, c.realBase);
        _send(feeRecipient, fee);
        if (refund > 0) _send(msg.sender, refund);
        if (c.tokensSold >= CURVE_SUPPLY) _graduate(token, c);
    }

    function _graduate(address token, Curve storage c) internal {
        c.graduated = true;
        uint256 base = c.realBase;
        uint256 tokens = TOTAL_SUPPLY - CURVE_SUPPLY;
        c.realBase = 0;
        OrvexToken(token).transfer(migrator, tokens);
        _send(migrator, base);
        emit Graduated(token, base, tokens);
    }

    // ---------------- views ----------------

    function quoteBuy(address token, uint256 baseIn) external view returns (uint256 tokensOut) {
        Curve storage c = curves[token];
        uint256 net = baseIn * (10_000 - FEE_BPS) / 10_000;
        tokensOut = c.virtualToken - (c.virtualBase * c.virtualToken) / (c.virtualBase + net);
        uint256 remaining = CURVE_SUPPLY - c.tokensSold;
        if (tokensOut > remaining) tokensOut = remaining;
    }

    function quoteSell(address token, uint256 tokensIn) external view returns (uint256 baseOut) {
        Curve storage c = curves[token];
        uint256 gross = c.virtualBase - (c.virtualBase * c.virtualToken) / (c.virtualToken + tokensIn);
        baseOut = gross - gross * FEE_BPS / 10_000;
    }

    function tokenCount() external view returns (uint256) { return allTokens.length; }

    // ---------------- admin ----------------

    function setFees(address _feeRecipient, uint256 _createFee) external onlyOwner {
        feeRecipient = _feeRecipient;
        createFee = _createFee;
    }
    function setMigrator(address _migrator) external onlyOwner { migrator = _migrator; }
    function transferOwnership(address n) external onlyOwner { owner = n; }

    function _send(address to, uint256 v) internal {
        if (v == 0) return;
        (bool ok,) = to.call{value: v}("");
        require(ok, "send failed");
    }
}
