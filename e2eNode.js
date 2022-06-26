
const { spawn } = require("child_process");
const { killPortProcess } = require('kill-port-process');

const NEURON_CONTRACTS_REPOSITORY_PATH = 'C:/Users/anast/Desktop/alex/neuron-contracts'
const NEURON_OPTIONS_REPOSITORY_PATH = 'C:/Users/anast/Desktop/alex/neuron-options'
const NEURON_OPTION_STRATEGY_REPOSITORY_PATH = 'C:/Users/anast/Desktop/alex/neuron-option-strategy'

const SHELL = true;
const NODE_PORT = 8545;

if (!process.argv[2]) throw Error('First argument undefined')
const lastCommand = process.argv[2]


killPortProcess(NODE_PORT).finally(e => {

    // First cmd
    const nodeCmd = spawn("npx hardhat node", [], { cwd: NEURON_OPTIONS_REPOSITORY_PATH, shell: SHELL });

    nodeCmd.stdout.on("data", data => {
        console.log(`node stdout: ${data}`)
        if (data.includes('Started HTTP and WebSocket JSON-RPC server at')) {
            // Second cmd
            const neuronContractsDeployCmd = spawn("npx hardhat deploy --network localhost", [], { cwd: NEURON_CONTRACTS_REPOSITORY_PATH, shell: SHELL });

            neuronContractsDeployCmd.stdout.on("data", data => {
                console.log(`neuronContractsDeploy stdout: ${data}`);
            });

            neuronContractsDeployCmd.stderr.on("data", data => {
                console.log(`neuronContractsDeploy stderr: ${data}`);
            });

            neuronContractsDeployCmd.on('error', (error) => {
                console.log(`neuronContractsDeploy error: ${error.message}`);
            });

            neuronContractsDeployCmd.on("close", code => {
                console.log(`neuronContractsDeploy child process exited with code ${code}`);
                // Third cmd
                const lastCommandCmd = spawn(lastCommand, [], { cwd: NEURON_OPTION_STRATEGY_REPOSITORY_PATH, shell: SHELL });

                lastCommandCmd.stdout.on("data", data => {
                    console.log(`lastCommand stdout: ${data}`);
                });

                lastCommandCmd.stderr.on("data", data => {
                    console.log(`lastCommand stderr: ${data}`);
                });

                lastCommandCmd.on('error', (error) => {
                    console.log(`lastCommand error: ${error.message}`);
                });

                lastCommandCmd.on("close", code => {
                    console.log(`lastCommand child process exited with code ${code}`);
                    // Exit
                    nodeCmd.stdin.pause();
                    nodeCmd.kill();
                });
            });
        }
    });

    nodeCmd.stderr.on("data", data => {
        console.log(`node stderr: ${data}`);
    });

    nodeCmd.on('error', (error) => {
        console.log(`node error: ${error.message}`);
    });

    nodeCmd.on("close", code => {
        console.log(`node child process exited with code ${code}`);
    });
})
