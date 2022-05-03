pragma solidity 0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import {NeuronPoolBase} from "./NeuronPoolBase.sol";
import "../interfaces/IController.sol";

abstract contract NeuronPoolCurveBase is NeuronPoolBase {
    using SafeERC20 for IERC20;

    constructor(
        address _token,
        address _governance,
        address _timelock,
        address _controller,
        address _masterchef
    )
        NeuronPoolBase(_token, _governance, _timelock, _controller, _masterchef)
    {}

    function depositBaseToken(
        address _token,
        uint256 _amount
    ) internal virtual returns (uint256);

    function withdrawBaseToken(
        address _token,
        uint256 _userLpTokensAmount
    ) internal virtual;

    function deposit(
        address _enterToken,
        uint256 _amount
    ) public override {
        super.deposit(_enterToken, _amount);
        require(_amount > 0, "!amount");

        address self = address(this);
        IERC20 tokenMem = token;
        IERC20 enterToken = IERC20(_enterToken);

        uint256 amount = _amount;

        if (enterToken == tokenMem) {
            tokenMem.safeTransferFrom(msg.sender, self, _amount);
        } else {
            amount = depositBaseToken(_enterToken, _amount);
        }

        uint256 totalSupplyMem = totalSupply();

        _mint(
            msg.sender,
            totalSupplyMem == 0 ? amount : (amount * totalSupplyMem) / balance()
        );
    }

    function withdraw(
        address _withdrawableToken,
        uint256 _shares
    ) public override {
        super.withdraw(_withdrawableToken, _shares);
        require(_shares > 0, "!shares");
        
        address self = address(this);
        IERC20 withdrawableToken = IERC20(_withdrawableToken);
        IERC20 tokenMem = token;

        uint256 userLpTokensAmount = (balance() * _shares) / totalSupply();
        _burn(msg.sender, _shares);

        uint256 neuronPoolBalance = tokenMem.balanceOf(self);
        // If pool balance's not enough, we're withdrawing the controller's tokens
        if (userLpTokensAmount > neuronPoolBalance) {
            uint256 _withdraw = userLpTokensAmount - neuronPoolBalance;
            IController(controller).withdraw(address(tokenMem), _withdraw);
            uint256 _after = tokenMem.balanceOf(self);
            uint256 _diff = _after - neuronPoolBalance;
            if (_diff < _withdraw) {
                userLpTokensAmount = neuronPoolBalance + _diff;
            }
        }

        if (withdrawableToken != tokenMem) {
            withdrawBaseToken(_withdrawableToken, userLpTokensAmount);
        } else {
            token.safeTransfer(msg.sender, userLpTokensAmount);
        }
    }
}
