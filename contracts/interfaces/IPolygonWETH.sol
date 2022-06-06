pragma solidity 0.8.2;

interface IPolygonWETH {
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MetaTransactionExecuted(address userAddress, address relayerAddress, bytes functionSignature);
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event Transfer(address indexed from, address indexed to, uint256 value);

    function CHILD_CHAIN_ID() external view returns (uint256);

    function CHILD_CHAIN_ID_BYTES() external view returns (bytes memory);

    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);

    function DEPOSITOR_ROLE() external view returns (bytes32);

    function ERC712_VERSION() external view returns (string memory);

    function ROOT_CHAIN_ID() external view returns (uint256);

    function ROOT_CHAIN_ID_BYTES() external view returns (bytes memory);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function balanceOf(address account) external view returns (uint256);

    function decimals() external view returns (uint8);

    function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);

    function deposit(address user, bytes memory depositData) external;

    function executeMetaTransaction(
        address userAddress,
        bytes memory functionSignature,
        bytes32 sigR,
        bytes32 sigS,
        uint8 sigV
    ) external payable returns (bytes memory);

    function getChainId() external pure returns (uint256);

    function getDomainSeperator() external view returns (bytes32);

    function getNonce(address user) external view returns (uint256 nonce);

    function getRoleAdmin(bytes32 role) external view returns (bytes32);

    function getRoleMember(bytes32 role, uint256 index) external view returns (address);

    function getRoleMemberCount(bytes32 role) external view returns (uint256);

    function grantRole(bytes32 role, address account) external;

    function hasRole(bytes32 role, address account) external view returns (bool);

    function increaseAllowance(address spender, uint256 addedValue) external returns (bool);

    function name() external view returns (string memory);

    function renounceRole(bytes32 role, address account) external;

    function revokeRole(bytes32 role, address account) external;

    function symbol() external view returns (string memory);

    function totalSupply() external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);

    function withdraw(uint256 amount) external;
}
