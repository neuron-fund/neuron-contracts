
const replace = require('replace-in-file');

// TODO remove when fixed
// https://github.com/nomiclabs/hardhat/issues/1696
const fixAbiGasType = async () => {
  try {
    const results = await replace({
      files: 'node_modules/@ethersproject/abi/lib/fragments.d.ts',
      from: `gas?: string;`,
      to: `gas?: string | number;`
    });

  } catch (e) {
    console.log('error while trying to fix "fixAbiGasType.js"', e);
  }
};

fixAbiGasType();