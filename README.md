# 🏦 BTCFi Lending Protocol

> **Protocolo de Lending Descentralizado en Starknet**
>
> Deposita Bitcoin (wBTC) como colateral y pide prestado stablecoins (mUSD) con precios en tiempo real de Pragma Oracle.

[![Cairo](https://img.shields.io/badge/Cairo-2.13.1-orange)](https://www.cairo-lang.org/)
[![Starknet](https://img.shields.io/badge/Starknet-Sepolia-blue)](https://sepolia.starkscan.co/)
[![Tests](https://img.shields.io/badge/Tests-8%2F8%20Passing-green)](./packages/snfoundry/contracts/tests)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

![BTCFi Lending Protocol](./docs/lending_flow_diagram_1766270520272.png)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Demo en Vivo](#-demo-en-vivo)
- [Cómo Funciona](#-cómo-funciona)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Contratos Desplegados](#-contratos-desplegados)
- [Tests](#-tests)
- [Documentación](#-documentación)
- [Contribuir](#-contribuir)

---

## ✨ Características

### Smart Contracts (Cairo)

- ✅ **Depósito de Colateral** - Deposita wBTC como garantía
- ✅ **Préstamos CDP** - Mintea mUSD contra tu colateral (80% LTV)
- ✅ **Health Factor Dinámico** - Monitoreo en tiempo real con precios de Pragma Oracle
- ✅ **Liquidaciones Automáticas** - Protección del protocolo cuando HF < 100
- ✅ **Repago y Retiro** - Paga tu deuda y retira tu colateral
- ✅ **Tests Completos** - 8 tests cubriendo todos los escenarios

### Frontend (Next.js)

- ✅ **Interfaz Intuitiva** - UI moderna con Scaffold-Stark
- ✅ **Conexión de Wallet** - Soporte para Braavos y Argent
- ✅ **Dashboard en Tiempo Real** - Visualiza tu posición, HF, y estadísticas del protocolo
- ✅ **Precio de Oráculo** - Integración con Pragma Oracle ($112,165 BTC en Sepolia)
- ✅ **Transacciones Guiadas** - Flujo paso a paso para cada operación

---

## 🎮 Demo en Vivo

**Testnet:** Sepolia  
**Contrato BTCLending:** [`0x03e40fb08cb0a8f6c48615846ada6de5414f5eaf5de6a5976c711758f0bfb39d`](https://sepolia.starkscan.co/contract/0x03e40fb08cb0a8f6c48615846ada6de5414f5eaf5de6a5976c711758f0bfb39d)

### Prueba el Protocolo

1. **Conecta tu wallet** (Braavos o Argent en Sepolia)
2. **Mintea wBTC de prueba** (función disponible en la UI)
3. **Deposita colateral** (Approve + Deposit)
4. **Pide prestado mUSD** (hasta 80% del valor de tu colateral)
5. **Verifica tu wallet** - Los tokens mUSD aparecerán automáticamente

---

## 🔍 Cómo Funciona

### Modelo CDP (Collateralized Debt Position)

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DEL PROTOCOLO                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. DEPOSITAR                                               │
│     Usuario deposita 2 wBTC ($224,330 @ $112,165/BTC)      │
│     ↓                                                       │
│     Colateral registrado en el contrato                     │
│                                                             │
│  2. PEDIR PRESTADO                                          │
│     Usuario puede pedir hasta $179,464 (80% LTV)           │
│     ↓                                                       │
│     Protocolo MINTEA $89,732 mUSD                           │
│     ↓                                                       │
│     Tokens mUSD aparecen en la wallet del usuario           │
│     ↓                                                       │
│     Health Factor = 2.00 (saludable ✅)                     │
│                                                             │
│  3. REPAGAR                                                 │
│     Usuario repaga $89,732 mUSD                             │
│     ↓                                                       │
│     Protocolo QUEMA los tokens mUSD                         │
│     ↓                                                       │
│     Deuda eliminada                                         │
│                                                             │
│  4. RETIRAR                                                 │
│     Usuario retira sus 2 wBTC                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Health Factor

```
HF = (Colateral en USD × 80% × 100) / Deuda

HF >= 100 → Saludable ✅
HF < 100  → Liquidable ⚠️
```

**Ejemplo Real:**

```
Depositas: 2 wBTC ($224,330)
Pides prestado: $89,732
HF = ($224,330 × 0.8 × 100) / $89,732 = 2.00 ✅

Si BTC cae a $50,000:
HF = ($100,000 × 0.8 × 100) / $89,732 = 0.89 ⚠️
→ Liquidable
```

---

## 🛠️ Tecnologías

### Smart Contracts

- **Cairo 2.13.1** - Lenguaje de programación para Starknet
- **Starknet Foundry** - Framework de testing y deployment
- **Scarb** - Build tool y package manager para Cairo
- **OpenZeppelin Cairo Contracts** - Librerías estándar (ERC20, Ownable)
- **Pragma Oracle** - Precios de BTC en tiempo real

### Frontend

- **Next.js 14** - Framework de React
- **Scaffold-Stark** - Toolkit para dApps en Starknet
- **Starknet.js** - Librería para interactuar con Starknet
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling

### Infraestructura

- **Sepolia Testnet** - Red de pruebas de Starknet
- **Braavos/Argent** - Wallets compatibles
- **Starkscan** - Block explorer

---

## 📁 Estructura del Proyecto

```
btc_lending_project/
├── packages/
│   ├── snfoundry/                    # Smart Contracts (Cairo)
│   │   └── contracts/
│   │       ├── src/
│   │       │   ├── lib.cairo         # Contrato principal BTCLending
│   │       │   └── mocks/
│   │       │       ├── erc20_mock.cairo  # MockWBTC
│   │       │       └── usd_mock.cairo    # MockUSD (mUSD)
│   │       ├── tests/
│   │       │   └── test_contract.cairo   # Suite de tests (8 tests)
│   │       └── Scarb.toml
│   │
│   └── nextjs/                       # Frontend (Next.js)
│       ├── app/                      # Pages y routing
│       ├── components/
│       │   └── btcfi/                # Componentes del protocolo
│       │       ├── ProtocolStats.tsx     # Dashboard
│       │       ├── MintWBTCForm.tsx      # Mintear wBTC
│       │       ├── DepositForm.tsx       # Depositar colateral
│       │       ├── BorrowForm.tsx        # Pedir prestado
│       │       ├── RepayForm.tsx         # Repagar deuda
│       │       └── WithdrawForm.tsx      # Retirar colateral
│       ├── contracts/
│       │   └── deployedContracts.ts  # ABIs y direcciones
│       └── package.json
│
├── docs/                             # Documentación
│   ├── README.md                     # Índice de documentación
│   ├── decimals_guide.md             # Guía de decimales
│   ├── liquidation_guide.md          # Guía de liquidaciones
│   ├── code_explanation.md           # Explicación del código
│   └── *.png                         # Infografías
│
└── README.md                         # Este archivo
```

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** v18+ y **Yarn**
- **Scarb** v2.13.1+ ([Instalar](https://docs.swmansion.com/scarb/))
- **Starknet Foundry** v0.52.0+ ([Instalar](https://foundry-rs.github.io/starknet-foundry/))
- **Wallet** Braavos o Argent con fondos en Sepolia

### Clonar el Repositorio

```bash
git clone https://github.com/alebeta06/btc_lending_project.git
cd btc_lending_project
```

### Instalar Dependencias

```bash
# Instalar dependencias del frontend
cd packages/nextjs
yarn install
```

### Compilar Contratos

```bash
cd packages/snfoundry/contracts
scarb build
```

---

## 💻 Uso

### Ejecutar el Frontend

```bash
cd packages/nextjs
yarn dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Ejecutar Tests

```bash
cd packages/snfoundry/contracts
snforge test
```

**Resultado esperado:**

```
Tests: 8 passed, 0 failed, 0 ignored ✅
```

---

## 📜 Contratos Desplegados

### Sepolia Testnet

| Contrato           | Dirección                                                            | Starkscan                                                                                                       |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **BTCLending**     | `0x03e40fb08cb0a8f6c48615846ada6de5414f5eaf5de6a5976c711758f0bfb39d` | [Ver](https://sepolia.starkscan.co/contract/0x03e40fb08cb0a8f6c48615846ada6de5414f5eaf5de6a5976c711758f0bfb39d) |
| **MockWBTC**       | `0x01f0fe1fe348e56add1037ef026ed141a038294209104af59c0fbb398e469a29` | [Ver](https://sepolia.starkscan.co/contract/0x01f0fe1fe348e56add1037ef026ed141a038294209104af59c0fbb398e469a29) |
| **MockUSD (mUSD)** | `0x076f5270bb50124f87f772a4af59ffd1331c915ccb6a44db9d57282f00eebcbf` | [Ver](https://sepolia.starkscan.co/contract/0x076f5270bb50124f87f772a4af59ffd1331c915ccb6a44db9d57282f00eebcbf) |
| **Pragma Oracle**  | `0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a`  | [Ver](https://sepolia.starkscan.co/contract/0x36031daa264c24520b11d93af622c848b2499b66b41d611bac95e13cfca131a)  |

### Parámetros del Protocolo

- **Liquidation Threshold:** 80% (LTV máximo)
- **Precio BTC (Pragma Oracle):** ~$112,165 (actualizado en tiempo real)
- **Decimales wBTC:** 8
- **Decimales mUSD:** 13 (para coincidir con formato de Pragma)

---

## 🧪 Tests

### Suite Completa

| Test                                             | Descripción                              | Estado |
| ------------------------------------------------ | ---------------------------------------- | ------ |
| `test_health_factor_no_debt`                     | HF sin deuda = infinito                  | ✅     |
| `test_get_user_collateral_initial`               | Colateral inicial = 0                    | ✅     |
| `test_deposit_collateral_with_mock`              | Depósito de colateral                    | ✅     |
| `test_borrow_with_sufficient_collateral`         | Préstamo exitoso con HF saludable        | ✅     |
| `test_borrow_fails_with_insufficient_collateral` | Préstamo rechazado por HF bajo           | ✅     |
| `test_cannot_liquidate_healthy_user`             | Protección contra liquidación prematura  | ✅     |
| `test_health_factor_changes_with_price`          | HF dinámico con cambios de precio        | ✅     |
| `test_liquidation_after_price_drop`              | Liquidación exitosa tras caída de precio | ✅     |

### Ejecutar Tests

```bash
cd packages/snfoundry/contracts
snforge test -vv  # Verbose mode para ver detalles
```

---

## 📚 Documentación

### Guías Educativas

Hemos creado guías completas para entender cada aspecto del protocolo:

| Guía                        | Descripción                        | Nivel        | Link                               |
| --------------------------- | ---------------------------------- | ------------ | ---------------------------------- |
| **Decimales y Matemáticas** | Cómo funcionan los números en DeFi | Principiante | [Ver](./docs/decimals_guide.md)    |
| **Liquidaciones**           | Proceso completo de liquidación    | Intermedio   | [Ver](./docs/liquidation_guide.md) |
| **Explicación del Código**  | Código comentado línea por línea   | Avanzado     | [Ver](./docs/code_explanation.md)  |

### Conceptos Clave

- ✅ Escalas de decimales en blockchain (8 para BTC, 13 para USD)
- ✅ Health Factor y cómo se calcula
- ✅ Por qué y cómo ocurren las liquidaciones
- ✅ Patrón `approve` + `transfer_from` en ERC20
- ✅ Testing con Starknet Foundry
- ✅ Integración de oráculos (Pragma)
- ✅ Modelo CDP vs Lending Pool

---

## 🎯 Características Técnicas

### Smart Contract (Cairo)

```cairo
// Funciones principales
fn deposit_collateral(amount: u256)
fn borrow(amount: u256)              // Mintea mUSD
fn repay(amount: u256)               // Quema mUSD
fn withdraw_collateral(amount: u256)
fn liquidate(user: ContractAddress)
fn calculate_health_factor(user: ContractAddress) -> u256
fn get_oracle_price() -> u256        // Pragma Oracle
```

### Frontend (React/Next.js)

- **Componentes Modulares** - Cada función tiene su propio componente
- **Hooks Personalizados** - `useScaffoldReadContract`, `useScaffoldWriteContract`
- **Estado Global** - Manejo de wallet y conexión
- **Notificaciones** - Feedback visual para cada transacción
- **Responsive Design** - Funciona en desktop y mobile

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si quieres mejorar este proyecto:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/mejora`)
3. Commit tus cambios (`git commit -m 'Agregar mejora'`)
4. Push a la rama (`git push origin feature/mejora`)
5. Abre un Pull Request

### Áreas de Mejora

- [ ] Soporte para más tipos de colateral (ETH, USDC)
- [ ] Tasas de interés variables
- [ ] Rewards para liquidadores
- [ ] Governance token
- [ ] Despliegue en mainnet

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- [OpenZeppelin Cairo Contracts](https://github.com/OpenZeppelin/cairo-contracts) - Librerías estándar
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) - Testing framework
- [Scaffold-Stark](https://github.com/Scaffold-Stark/scaffold-stark-2) - Frontend toolkit
- [Pragma Oracle](https://www.pragma.build/) - Precios en tiempo real
- [Cairo Book](https://book.cairo-lang.org/) - Documentación de Cairo
- Comunidad de Starknet

---

## 📞 Contacto

- **GitHub**: [@alebeta06](https://github.com/alebeta06)
- **Proyecto**: [BTCFi Lending Protocol](https://github.com/alebeta06/btc_lending_project)

---

<div align="center">
  <p>Hecho con ❤️ para aprender DeFi, Cairo y Starknet</p>
  <p>⭐ Si te gustó este proyecto, dale una estrella!</p>
  <p>🚀 Desplegado en Starknet Sepolia</p>
</div>
