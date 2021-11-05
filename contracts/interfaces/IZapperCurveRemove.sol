pragma solidity >=0.7.0 <0.9.0;

interface IZapperCurveRemove {
  event OwnershipTransferred(
    address indexed previousOwner,
    address indexed newOwner
  );
  event zapOut(address sender, address pool, address token, uint256 tokensRec);

  fallback() external payable;

  function ZapOut(
    address swapAddress,
    uint256 incomingCrv,
    address intermediateToken,
    address toToken,
    uint256 minToTokens,
    address _swapTarget,
    bytes memory _swapCallData,
    address affiliate,
    bool shouldSellEntireBalance
  ) external returns (uint256 ToTokensBought);

  function affiliateBalance(address, address) external view returns (uint256);

  function affiliates(address) external view returns (bool);

  function affilliateWithdraw(address[] memory tokens) external;

  function approvedTargets(address) external view returns (bool);

  function curveReg() external view returns (address);

  function feeWhitelist(address) external view returns (bool);

  function goodwill() external view returns (uint256);

  function isOwner() external view returns (bool);

  function owner() external view returns (address);

  function removeLiquidityReturn(
    address swapAddress,
    address tokenAddress,
    uint256 liquidity
  ) external view returns (uint256 amount);

  function renounceOwnership() external;

  function setApprovedTargets(
    address[] memory targets,
    bool[] memory isApproved
  ) external;

  function setV2Pool(address[] memory pool, bool[] memory isV2Pool) external;

  function set_affiliate(address _affiliate, bool _status) external;

  function set_feeWhitelist(address zapAddress, bool status) external;

  function set_new_affiliateSplit(uint256 _new_affiliateSplit) external;

  function set_new_goodwill(uint256 _new_goodwill) external;

  function stopped() external view returns (bool);

  function toggleContractActive() external;

  function totalAffiliateBalance(address) external view returns (uint256);

  function transferOwnership(address newOwner) external;

  function updateCurveRegistry(address newCurveRegistry) external;

  function withdrawTokens(address[] memory tokens) external;
}
