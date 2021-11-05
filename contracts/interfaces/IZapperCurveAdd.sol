pragma solidity >=0.7.0 <0.9.0;

interface IZapperCurveAdd {
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );
    event zapIn(address sender, address pool, uint256 tokensRec);

    function ZapIn(
        address fromTokenAddress,
        address toTokenAddress,
        address swapAddress,
        uint256 incomingTokenQty,
        uint256 minPoolTokens,
        address swapTarget,
        bytes memory swapData,
        address affiliate,
        bool shouldSellEntireBalance
    ) external payable returns (uint256 crvTokensBought);

    function affiliateBalance(address, address) external view returns (uint256);

    function affiliates(address) external view returns (bool);

    function affilliateWithdraw(address[] memory tokens) external;

    function approvedTargets(address) external view returns (bool);

    function curveReg() external view returns (address);

    function feeWhitelist(address) external view returns (bool);

    function goodwill() external view returns (uint256);

    function owner() external view returns (address);

    function renounceOwnership() external;

    function setApprovedTargets(
        address[] memory targets,
        bool[] memory isApproved
    ) external;

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

    receive() external payable;
}
