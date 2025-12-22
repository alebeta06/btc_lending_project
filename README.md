# 🏦 BTCFi Lending Protocol

Un protocolo de lending descentralizado construido en **Starknet** que permite a los usuarios depositar Bitcoin (wBTC) como colateral y pedir prestado contra él.

> **Proyecto Educativo**: Este proyecto fue creado con fines educativos para aprender sobre protocolos de lending, matemáticas DeFi y desarrollo en Cairo.

[![Cairo](https://img.shields.io/badge/Cairo-2.13.1-orange)](https://www.cairo-lang.org/)
[![Starknet](https://img.shields.io/badge/Starknet-Foundry-blue)](https://foundry-rs.github.io/starknet-foundry/)
[![Tests](https://img.shields.io/badge/Tests-8%2F8%20Passing-green)](./tests)
[![License](https://img.shields.io/badge/License-MIT-yellow)](./LICENSE)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Cómo Funciona](#-cómo-funciona)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Tests](#-tests)
- [Documentación](#-documentación)
- [Roadmap](#-roadmap)
- [Contribuir](#-contribuir)

---

## ✨ Características

- ✅ **Depósito de Colateral**: Los usuarios pueden depositar wBTC como garantía
- ✅ **Préstamos**: Pedir prestado hasta el 80% del valor del colateral
- ✅ **Health Factor**: Sistema de salud de préstamos en tiempo real
- ✅ **Liquidaciones Automáticas**: Protección del protocolo mediante liquidaciones
- ✅ **Tests Completos**: 8 tests cubriendo todos los escenarios
- ✅ **Código Comentado**: Todo el código está comentado en español

---

## 🔍 Cómo Funciona

### 1. Depositar Colateral

```
Usuario deposita 1 BTC (vale $60,000)
↓
Colateral registrado en el protocolo
```

### 2. Pedir Prestado

```
Usuario puede pedir hasta $48,000 (80% del colateral)
↓
Health Factor = 160 (saludable ✅)
```

### 3. Liquidación

```
Si BTC cae a $35,000:
↓
Health Factor = 93 (liquidable ⚠️)
↓
Liquidador paga la deuda y recibe el BTC
```

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────┐
│           BTCLending Contract               │
├─────────────────────────────────────────────┤
│                                             │
│  Storage:                                   │
│  ├─ user_collateral: Map<Address, u256>    │
│  ├─ user_debt: Map<Address, u256>          │
│  ├─ wbtc_token: ContractAddress            │
│  ├─ liquidation_threshold: u256 (80%)      │
│  └─ oracle_price: u256                     │
│                                             │
│  Functions:                                 │
│  ├─ deposit_collateral()                   │
│  ├─ borrow()                                │
│  ├─ liquidate()                             │
│  └─ calculate_health_factor()              │
│                                             │
└─────────────────────────────────────────────┘
```

### Componentes Principales

| Archivo                                                      | Descripción                   |
| ------------------------------------------------------------ | ----------------------------- |
| [`src/lib.cairo`](./src/lib.cairo)                           | Contrato principal de lending |
| [`src/mocks/erc20_mock.cairo`](./src/mocks/erc20_mock.cairo) | Token wBTC mock para testing  |
| [`tests/test_contract.cairo`](./tests/test_contract.cairo)   | Suite completa de tests       |

---

## 🚀 Instalación

### Prerrequisitos

- [Scarb](https://docs.swmansion.com/scarb/) v2.13.1+
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/) v0.52.0+

### Pasos

```bash
# Clonar el repositorio
git clone https://github.com/tuusuario/btc_lending_project.git
cd btc_lending_project

# Compilar el proyecto
scarb build

# Ejecutar los tests
snforge test
```

---

## 🧪 Tests

El proyecto incluye **8 tests** que cubren todos los escenarios:

```bash
snforge test
```

### Suite de Tests

| Test                                             | Descripción                     | Estado |
| ------------------------------------------------ | ------------------------------- | ------ |
| `test_health_factor_no_debt`                     | HF sin deuda                    | ✅     |
| `test_get_user_collateral_initial`               | Colateral inicial               | ✅     |
| `test_deposit_collateral_with_mock`              | Depósito de colateral           | ✅     |
| `test_borrow_with_sufficient_collateral`         | Préstamo exitoso                | ✅     |
| `test_borrow_fails_with_insufficient_collateral` | Préstamo fallido                | ✅     |
| `test_liquidation_after_price_drop`              | Liquidación por caída de precio | ✅     |
| `test_cannot_liquidate_healthy_user`             | Protección contra liquidación   | ✅     |
| `test_health_factor_changes_with_price`          | HF dinámico                     | ✅     |

---

## 📚 Documentación

Hemos creado guías educativas completas para entender el proyecto:

### 📖 Guías Disponibles

| Guía                       | Descripción                        | Link                                    |
| -------------------------- | ---------------------------------- | --------------------------------------- |
| **Decimales y Escalas**    | Cómo funcionan los números en DeFi | [Ver Guía](./docs/decimals_guide.md)    |
| **Liquidaciones**          | Proceso completo de liquidación    | [Ver Guía](./docs/liquidation_guide.md) |
| **Explicación del Código** | Código comentado línea por línea   | [Ver Guía](./docs/code_explanation.md)  |

### 🎓 Lo que Aprenderás

- ✅ Cómo funcionan las escalas de decimales en blockchain
- ✅ Qué es el Health Factor y cómo se calcula
- ✅ Por qué y cómo ocurren las liquidaciones
- ✅ Patrón `approve` + `transfer_from` en ERC20
- ✅ Testing con Starknet Foundry
- ✅ Mejores prácticas en Cairo

---

## 🎯 Conceptos Clave

### Health Factor (HF)

```
HF = (Colateral en USD × 80% × 100) / Deuda

HF >= 100 → Saludable ✅
HF < 100  → Liquidable ⚠️
```

### Ejemplo Real

```
Depositas: 1 BTC ($60,000)
Pides prestado: $30,000
HF = ($60,000 × 0.8 × 100) / $30,000 = 160 ✅

Si BTC cae a $35,000:
HF = ($35,000 × 0.8 × 100) / $30,000 = 93 ⚠️
→ Liquidable
```

---

## 🗺️ Roadmap

### ✅ Fase 1: MVP (Completado)

- [x] Contrato de lending básico
- [x] Sistema de Health Factor
- [x] Liquidaciones
- [x] Tests completos
- [x] Documentación educativa

### 🚧 Fase 2: Integración (Próximamente)

- [ ] Integrar Pragma Oracle real
- [ ] Soporte para múltiples colaterales
- [ ] Función `repay` para pagar deuda
- [ ] Función `withdraw` para retirar colateral

### 🔮 Fase 3: Frontend (Futuro)

- [ ] Interfaz web con Starknet.js
- [ ] Dashboard de usuario
- [ ] Visualización de Health Factor en tiempo real
- [ ] Integración con wallets (Argent, Braavos)

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si quieres mejorar este proyecto:

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/mejora`)
3. Commit tus cambios (`git commit -m 'Agregar mejora'`)
4. Push a la rama (`git push origin feature/mejora`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

## 🙏 Agradecimientos

- [OpenZeppelin Cairo Contracts](https://github.com/OpenZeppelin/cairo-contracts)
- [Starknet Foundry](https://foundry-rs.github.io/starknet-foundry/)
- [Cairo Book](https://book.cairo-lang.org/)
- Comunidad de Starknet

---

## 📞 Contacto

- **GitHub**: [@alebeta06](https://github.com/alebeta06)
- **Twitter**: [@tuusuario](https://twitter.com/tuusuario)

---

<div align="center">
  <p>Hecho con ❤️ para aprender DeFi y Cairo</p>
  <p>⭐ Si te gustó este proyecto, dale una estrella!</p>
</div>
