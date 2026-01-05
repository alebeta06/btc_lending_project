#!/bin/bash
echo "🔄 Migrando a Pragma Oracle..."

# 1. Crear nueva versión del archivo con Pragma
cat > src/lib_pragma.cairo << 'EOF'
// ============================================
// CONTRATO DE LENDING BTCFi
// ============================================
// Este contrato permite a los usuarios depositar Bitcoin (wBTC) como colateral
// y pedir prestado contra ese colateral. Incluye liquidaciones automáticas.

// Pragma Oracle Imports
use starknet::ContractAddress;
use pragma_lib::abi::{IPragmaABIDispatcher, IPragmaABIDispatcherTrait};
use pragma_lib::types::{DataType, PragmaPricesResponse};

pub mod mocks;
EOF

# 2. Copiar el resto del archivo desde la línea 16 en adelante (después de los imports)
tail -n +16 src/lib.cairo >> src/lib_pragma.cairo

# 3. En el nuevo archivo, reemplazar todas las referencias
sed -i 's/chainlink_btc_usd/pragma_oracle/g' src/lib_pragma.cairo
sed -i 's/Chainlink BTC\/USD Price Feed/Pragma Oracle/g' src/lib_pragma.cairo
sed -i 's/Chainlink BTC\/USD Feed/Pragma Oracle/g' src/lib_pragma.cairo

echo "✅ Archivo base creado"
