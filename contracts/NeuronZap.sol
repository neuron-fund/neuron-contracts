pragma solidity 0.8.2;

import { INeuronPool } from "./interfaces/INeuronPool.sol";
import { IGauge } from "./interfaces/IGauge.sol";
import { IZapperCurveAdd } from "./interfaces/IZapperCurveAdd.sol";
import { IZapperCurveRemove } from "./interfaces/IZapperCurveRemove.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";


contract NeuronZap is Initializable {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  function zapIn(
    address sellToken,
    address buyToken,
    address neuronPool,
    address neuronGauge,
    uint256 amount,
    // The `to` field from the API response.
    address payable zapperContract,
    // The `data` field from the API response.
    bytes calldata zapperCallData
  ) external payable returns (uint256) {
    if (sellToken == address(0)) {
      require(msg.value > 0, "No eth sent");
    } else {
      require(msg.value == 0, "Eth sent with token");
      IERC20(sellToken).safeTransferFrom(msg.sender, address(this), amount);
      _approveToken(sellToken, zapperContract, type(uint256).max);
    }

    uint256 buyTokenAmountBefore = IERC20(buyToken).balanceOf(address(this));
    // Call the encoded Zap function call on the contract at `ZapContract`,
    // passing along any ETH attached to this function call for the Zap.
    // NOTE: You should restrict calls to trusted ZapContracts and never tokens!
    (bool isZapperSuccess, bytes memory returndata) = zapperContract.call{
      value: msg.value
    }(zapperCallData);
    require(isZapperSuccess, string(returndata));
    uint256 boughtTokensAmount = IERC20(buyToken).balanceOf(address(this)).sub(
      buyTokenAmountBefore
    );

    _approveToken(buyToken, neuronPool, boughtTokensAmount);
    INeuronPool(neuronPool).deposit(buyToken, boughtTokensAmount);
    uint256 poolTokensAmount = INeuronPool(neuronPool).balanceOf(address(this));
    require(poolTokensAmount > 0, "No pool tokens minted");
    _approveToken(neuronPool, neuronGauge, poolTokensAmount);
    IGauge(neuronGauge).depositFromSenderFor(poolTokensAmount, msg.sender);

    return poolTokensAmount;
  }

  // Zaps out of a Sushiswap pool into ETH or ERC20 Tokens or both using a Zapper Transaction Object
  // The contract must have a fallback function to receive ETH proceeds from a Zap Out
  function zapOut(
    address neuronPool,
    // The `buyTokenAddress` field from the API response.
    address buyToken,
    // The `to` field from the API response.
    address payable zapperContract,
    // The `data` field from the API response.
    bytes calldata zapperCallData
  ) external returns (uint256 tokensBought) {
    uint256 poolUserBalance = INeuronPool(neuronPool).balanceOf(msg.sender);
    require(poolUserBalance > 0, "Can't zap zero neuron pool balance");
    IERC20(neuronPool).safeTransferFrom(
      msg.sender,
      address(this),
      poolUserBalance
    );

    address fromToken = INeuronPool(neuronPool).token();
    INeuronPool(neuronPool).withdraw(fromToken, poolUserBalance);
    uint256 fromTokenAmount = IERC20(fromToken).balanceOf(address(this));
    _approveToken(fromToken, zapperContract, fromTokenAmount);

    // Check this contract's initial balance
    uint256 initialBalance = buyToken == address(0)
      ? address(this).balance
      : IERC20(buyToken).balanceOf(address(this));
    // Call the encoded Zap Out function call on the contract at `ZapContract`,
    // NOTE: You should restrict calls to trusted ZapContracts and never tokens!
    (bool isZapperSuccess, bytes memory returndata) = zapperContract.call(
      zapperCallData
    );
    require(isZapperSuccess, string(returndata));
    uint256 finlBal = buyToken == address(0)
      ? address(this).balance
      : IERC20(buyToken).balanceOf(address(this));
    tokensBought = finlBal.sub(initialBalance);
    IERC20(buyToken).safeTransfer(msg.sender, tokensBought);
  }

  function _approveToken(
    address token,
    address spender,
    uint256 amount
  ) internal {
    IERC20(token).safeApprove(spender, 0);
    IERC20(token).safeApprove(spender, amount);
  }
}
