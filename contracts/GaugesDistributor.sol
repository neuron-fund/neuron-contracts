pragma solidity ^0.7.3;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./Gauge.sol";
import "./NeuronToken.sol";

interface IMinter {
    function collect() external;
}

contract GaugesDistributor {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    IERC20 public immutable NEURON;
    IERC20 public immutable AXON;
    address public treasury;
    address public governance;

    uint256 public pid;
    uint256 public totalWeight;
    IMinter public minter;

    address[] internal _tokens;
    mapping(address => address) public gauges; // token => gauge
    mapping(address => uint256) public weights; // token => weight
    mapping(address => mapping(address => uint256)) public votes; // msg.sender => votes
    mapping(address => address[]) public tokenVote; // msg.sender => token
    mapping(address => uint256) public usedWeights; // msg.sender => total voting weight of user

    constructor(
        address _minter,
        address _neuronToken,
        address _axon,
        address _treasury,
        address _governance
    ) {
        minter = IMinter(_minter);
        NEURON = NeuronToken(_neuronToken);
        AXON = IERC20(_axon);
        treasury = _treasury;
        governance = _governance;
    }

    function setMinter(address _minter) public {
        require(msg.sender == governance, "!governance");
        minter = IMinter(_minter);
    }

    function setTreasury(address _treasury) public {
        require(msg.sender == governance, "!governance");
        treasury = _treasury;
    }

    function tokens() external view returns (address[] memory) {
        return _tokens;
    }

    function getGauge(address _token) external view returns (address) {
        return gauges[_token];
    }

    // Reset votes to 0
    function reset() external {
        _reset(msg.sender);
    }

    // Reset votes to 0
    function _reset(address _owner) internal {
        address[] storage _tokenVote = tokenVote[_owner];
        uint256 _tokenVoteCnt = _tokenVote.length;

        for (uint256 i = 0; i < _tokenVoteCnt; i++) {
            address _token = _tokenVote[i];
            uint256 _votes = votes[_owner][_token];

            if (_votes > 0) {
                // TODO totalWeight = 0 at the start, надо определиться делать его ранвым с самого начала или как
                totalWeight = totalWeight.sub(_votes);
                weights[_token] = weights[_token].sub(_votes);

                votes[_owner][_token] = 0;
            }
        }

        delete tokenVote[_owner];
    }

    // Adjusts _owner's votes according to latest _owner's AXON balance
    // TODO bot-called function
    function poke(address _owner) public {
        address[] memory _tokenVote = tokenVote[_owner];
        uint256 _tokenCnt = _tokenVote.length;
        uint256[] memory _weights = new uint256[](_tokenCnt);

        uint256 _prevUsedWeight = usedWeights[_owner];
        uint256 _weight = AXON.balanceOf(_owner);

        for (uint256 i = 0; i < _tokenCnt; i++) {
            uint256 _prevWeight = votes[_owner][_tokenVote[i]];
            _weights[i] = _prevWeight.mul(_weight).div(_prevUsedWeight);
        }

        _vote(_owner, _tokenVote, _weights);
    }

    function _vote(
        address _owner,
        address[] memory _tokenVote,
        uint256[] memory _weights
    ) internal {
        // _weights[i] = percentage * 100
        _reset(_owner);
        uint256 _tokenCnt = _tokenVote.length;
        uint256 _weight = AXON.balanceOf(_owner);
        uint256 _totalVoteWeight = 0;
        uint256 _usedWeight = 0;

        for (uint256 i = 0; i < _tokenCnt; i++) {
            _totalVoteWeight = _totalVoteWeight.add(_weights[i]);
        }

        for (uint256 i = 0; i < _tokenCnt; i++) {
            address _token = _tokenVote[i];
            address _gauge = gauges[_token];
            uint256 _tokenWeight =
                _weights[i].mul(_weight).div(_totalVoteWeight);

            if (_gauge != address(0x0)) {
                _usedWeight = _usedWeight.add(_tokenWeight);
                totalWeight = totalWeight.add(_tokenWeight);
                weights[_token] = weights[_token].add(_tokenWeight);
                tokenVote[_owner].push(_token);
                votes[_owner][_token] = _tokenWeight;
            }
        }

        usedWeights[_owner] = _usedWeight;
    }

    // Vote with AXON on a gauge
    function vote(address[] calldata _tokenVote, uint256[] calldata _weights)
        external
    {
        require(_tokenVote.length == _weights.length);
        _vote(msg.sender, _tokenVote, _weights);
    }

    function addGauge(address _token) external {
        require(msg.sender == governance, "!gov");
        require(gauges[_token] == address(0x0), "exists");
        gauges[_token] = address(
            new Gauge(_token, address(NEURON), address(AXON), address(treasury))
        );
        _tokens.push(_token);
    }

    // Fetches Neurons
    function collect() internal {
        minter.collect();
    }

    function length() external view returns (uint256) {
        return _tokens.length;
    }

    // TODO once-per-week call, check caller (Neuron bot contract) for frontrunning protection
    function distribute() external {
        collect();
        uint256 _balance = NEURON.balanceOf(address(this));
        if (_balance > 0 && totalWeight > 0) {
            for (uint256 i = 0; i < _tokens.length; i++) {
                address _token = _tokens[i];
                address _gauge = gauges[_token];
                uint256 _reward =
                    _balance.mul(weights[_token]).div(totalWeight);
                if (_reward > 0) {
                    NEURON.safeApprove(_gauge, 0);
                    NEURON.safeApprove(_gauge, _reward);
                    Gauge(_gauge).notifyRewardAmount(_reward);
                }
            }
        }
    }
}
