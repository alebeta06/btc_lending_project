# 📚 Guía Completa: Decimales y Matemáticas del Lending

## 🎯 Objetivo

Entender **exactamente** cómo funcionan los números en un protocolo de lending y por qué usamos escalas específicas.

---

## 🖼️ Visualización del Flujo Completo

![Diagrama del flujo de lending](/home/alebeta/.gemini/antigravity/brain/c8f881c8-3572-4cd5-9cf5-309f71a761ad/lending_flow_diagram_1766270520272.png)

![Escalas de decimales](/home/alebeta/.gemini/antigravity/brain/c8f881c8-3572-4cd5-9cf5-309f71a761ad/decimals_scale_visual_1766270550981.png)

---

## 📖 Parte 1: ¿Por qué necesitamos decimales?

### Problema del Mundo Real

En el mundo real, Bitcoin se puede dividir:

- **1 BTC** = 100,000,000 satoshis (la unidad más pequeña)
- Ejemplo: Puedes tener **0.5 BTC** o **50,000,000 satoshis**

### Problema en Blockchain

Los contratos inteligentes **NO pueden usar números decimales** directamente (no hay `float` o `double`).

**❌ No podemos hacer:**

```cairo
let btc_amount = 0.5; // ¡ERROR! No existe en Cairo
```

**✅ Solución: Usar enteros con escala**

```cairo
let btc_amount = 50_000_000; // Representa 0.5 BTC
```

---

## 🔢 Parte 2: Escalas en BTCLending

### Escala 1: wBTC (Wrapped Bitcoin)

**Decimales: 8**

| Cantidad Real  | Representación Interna | Explicación |
| -------------- | ---------------------- | ----------- |
| 1 BTC          | `100_000_000`          | 1 × 10^8    |
| 0.5 BTC        | `50_000_000`           | 0.5 × 10^8  |
| 0.01 BTC       | `1_000_000`            | 0.01 × 10^8 |
| 0.00000001 BTC | `1`                    | 1 satoshi   |

**Fórmula:**

```
Valor Interno = Valor Real × 10^8
```

**Ejemplo en código:**

```cairo
// Usuario deposita 1 BTC
let deposit_amount: u256 = 100_000_000; // 1 × 10^8
```

---

### Escala 2: Precio del Oráculo (BTC/USD)

**Decimales: Variable (nosotros usamos 13 dígitos totales)**

¿Por qué 13 dígitos? Para tener precisión hasta centavos.

| Precio Real | Representación Interna | Explicación    |
| ----------- | ---------------------- | -------------- |
| $60,000     | `6000000000000`        | 60,000 × 10^8  |
| $45,000     | `4500000000000`        | 45,000 × 10^8  |
| $100,000    | `10000000000000`       | 100,000 × 10^8 |
| $0.01       | `1000000`              | 1 centavo      |

**Fórmula:**

```
Precio Interno = Precio Real (USD) × 10^8
```

**Ejemplo en código:**

```cairo
// BTC vale $60,000
let btc_price: u256 = 6000000000000; // 60,000 × 10^8
```

---

### Escala 3: Deuda (USD)

**Decimales: Misma escala que el resultado de convertir BTC a USD**

Esta es la parte más confusa, así que vamos paso a paso.

---

## 🧮 Parte 3: Conversión de BTC a USD (El Corazón del Sistema)

### Fórmula Básica

```
Valor en USD = (Cantidad de BTC × Precio de BTC) / 10^8
```

### ¿Por qué dividimos entre 10^8?

Porque estamos multiplicando dos números que ya tienen escala:

- BTC tiene escala de 10^8
- Precio tiene escala de 10^8
- Al multiplicar, obtenemos escala de 10^16
- Dividimos entre 10^8 para volver a escala de 10^8

### Ejemplo Paso a Paso

**Escenario:** Tienes 1 BTC y BTC vale $60,000

#### Paso 1: Valores en escala interna

```
collateral = 100_000_000        (1 BTC)
btc_price  = 6000000000000      ($60,000)
```

#### Paso 2: Multiplicar

```
100_000_000 × 6000000000000 = 600_000_000_000_000_000
```

**Contemos los ceros:**

- `100_000_000` = 100 millones (8 ceros)
- `6000000000000` = 6 trillones (12 ceros)
- Al multiplicar: 100 × 6000 = 600,000
- Total de ceros: 8 + 12 = **20 ceros**
- Resultado: `600` seguido de **18 ceros** = `600_000_000_000_000_000`

Este número es **enorme** (600 mil billones o 600 cuatrillones). Representa "1 BTC × $60,000" pero con **doble escala** (10^8 × 10^8 = 10^16).

#### Paso 3: Dividir entre 10^8 para normalizar

```
600_000_000_000_000_000 / 100_000_000 = 6_000_000_000_000
```

**Resultado:** `6_000_000_000_000` representa **$60,000** en nuestra escala interna.

### En Código Cairo:

```cairo
let collateral = 100_000_000_u256;           // 1 BTC
let btc_price = 6000000000000_u256;          // $60,000
let collateral_value_usd = (collateral * btc_price) / 100_000_000;
// collateral_value_usd = 6_000_000_000_000 ($60,000)
```

---

## 💰 Parte 4: ¿Cuánto puedo pedir prestado?

### Concepto: Loan-to-Value (LTV)

Si tienes $60,000 en colateral, **NO** puedes pedir $60,000 prestado. ¿Por qué?

**Riesgo:** Si el precio de BTC baja, tu colateral vale menos y no podrías pagar la deuda.

**Solución:** Umbral de Liquidación (Liquidation Threshold)

En nuestro contrato: **80%** (8000/10000)

### Fórmula:

```
Máximo a Pedir = Valor del Colateral × 80%
```

### Ejemplo Visual:

```
Colateral: 1 BTC = $60,000
         ┌─────────────────────────────┐
         │   Valor Total: $60,000      │
         ├─────────────────────────────┤
         │ ✅ Puedes pedir: $48,000    │ ← 80%
         │    (Zona Segura)            │
         ├─────────────────────────────┤
         │ ⚠️  Buffer: $12,000         │ ← 20%
         │    (Protección)             │
         └─────────────────────────────┘
```

### En Código:

```cairo
// Valor del colateral en USD
let collateral_value_usd = 6_000_000_000_000; // $60,000

// Aplicar umbral del 80%
let liquidation_threshold = 8000; // 80% = 8000/10000
let collateral_adjusted = (collateral_value_usd * liquidation_threshold) / 10000;
// collateral_adjusted = 4_800_000_000_000 ($48,000)
```

**Puedes pedir hasta $48,000 de forma segura.**

---

## 🏥 Parte 5: Health Factor (Factor de Salud)

### ¿Qué es?

Un número que indica qué tan "saludable" está tu préstamo.

### Fórmula:

```
Health Factor = (Colateral Ajustado × 100) / Deuda
```

### Interpretación:

- **HF >= 100**: ✅ Saludable (no puedes ser liquidado)
- **HF < 100**: ⚠️ En riesgo (puedes ser liquidado)

### ¿Por qué multiplicamos por 100?

Para evitar decimales. En lugar de decir "HF = 1.6", decimos "HF = 160".

---

## 📊 Parte 6: Ejemplo Completo Paso a Paso

### Escenario Inicial:

- Depositas: **1 BTC**
- Precio BTC: **$60,000**
- Pides prestado: **$30,000**

### Paso 1: Convertir BTC a USD

```
collateral = 100_000_000                    (1 BTC)
btc_price = 6000000000000                   ($60,000)
collateral_value_usd = (100_000_000 × 6000000000000) / 100_000_000
                     = 6_000_000_000_000    ($60,000)
```

### Paso 2: Aplicar Umbral de Liquidación (80%)

```
collateral_adjusted = (6_000_000_000_000 × 8000) / 10000
                    = 4_800_000_000_000     ($48,000)
```

### Paso 3: Calcular Health Factor

```
debt = 3_000_000_000_000                    ($30,000)
health_factor = (4_800_000_000_000 × 100) / 3_000_000_000_000
              = 160
```

**Resultado:** HF = 160 ✅ (Saludable, porque 160 > 100)

---

## 📉 Parte 7: ¿Qué pasa si el precio cae?

### Escenario: BTC cae de $60,000 a $45,000

### Recalcular Paso 1:

```
collateral_value_usd = (100_000_000 × 4500000000000) / 100_000_000
                     = 4_500_000_000_000    ($45,000)
```

### Recalcular Paso 2:

```
collateral_adjusted = (4_500_000_000_000 × 8000) / 10000
                    = 3_600_000_000_000     ($36,000)
```

### Recalcular Paso 3:

```
debt = 3_000_000_000_000                    ($30,000 - no cambió)
health_factor = (3_600_000_000_000 × 100) / 3_000_000_000_000
              = 120
```

**Resultado:** HF = 120 ✅ (Todavía saludable)

---

### ¿Y si cae más? BTC = $40,000

```
collateral_value_usd = 4_000_000_000_000    ($40,000)
collateral_adjusted = 3_200_000_000_000     ($32,000)
health_factor = (3_200_000_000_000 × 100) / 3_000_000_000_000
              = 106
```

**Resultado:** HF = 106 ✅ (Apenas saludable)

---

### ¡Peligro! BTC = $35,000

```
collateral_value_usd = 3_500_000_000_000    ($35,000)
collateral_adjusted = 2_800_000_000_000     ($28,000)
health_factor = (2_800_000_000_000 × 100) / 3_000_000_000_000
              = 93
```

**Resultado:** HF = 93 ⚠️ **¡LIQUIDABLE!** (93 < 100)

---

## ⚡ Parte 8: Liquidación

Cuando HF < 100, un **liquidador** puede:

1. Pagar tu deuda ($30,000)
2. Recibir tu colateral (1 BTC)

### ¿Por qué lo haría?

Porque tu 1 BTC ahora vale $35,000, pero él solo paga $30,000.

**Ganancia del liquidador:** $5,000 (14% de profit)

### Código de Liquidación:

```cairo
fn liquidate(ref self: ContractState, user: ContractAddress) {
    // 1. Verificar que el usuario está en riesgo
    let health_factor = self.calculate_health_factor(user);
    assert(health_factor < 100, 'User is healthy');

    // 2. Transferir colateral al liquidador
    let collateral = self.user_collateral.read(user);
    token.transfer(liquidator, collateral);

    // 3. Limpiar la posición
    self.user_debt.write(user, 0);
    self.user_collateral.write(user, 0);
}
```

---

## 🎓 Parte 9: Resumen de Escalas

| Concepto          | Valor Real | Escala Interna      | Fórmula       |
| ----------------- | ---------- | ------------------- | ------------- |
| **1 BTC**         | 1.0        | `100_000_000`       | 1 × 10^8      |
| **Precio BTC**    | $60,000    | `6000000000000`     | 60,000 × 10^8 |
| **Deuda USD**     | $30,000    | `3_000_000_000_000` | 30,000 × 10^8 |
| **Health Factor** | 1.6        | `160`               | HF × 100      |

---

## 🧪 Parte 10: Verificar con un Test

Vamos a ver cómo se ve esto en un test real:

```cairo
#[test]
fn test_ejemplo_educativo() {
    // Setup
    let user = contract_address_const::<0x123>();
    let deposit_amount: u256 = 100_000_000;      // 1 BTC
    let borrow_amount: u256 = 3_000_000_000_000; // $30,000

    // Usuario deposita 1 BTC
    lending.deposit_collateral(deposit_amount);

    // Usuario pide $30,000
    lending.borrow(borrow_amount);

    // Verificar HF inicial (debería ser ~160)
    let hf = lending.calculate_health_factor(user);
    assert(hf == 160, 'HF should be 160');

    // Simular caída de precio a $45,000
    lending.set_oracle_price(4500000000000);

    // Verificar nuevo HF (debería ser ~120)
    let new_hf = lending.calculate_health_factor(user);
    assert(new_hf == 120, 'HF should be 120');
}
```

---

## 💡 Consejos Finales

1. **Siempre piensa en la escala**: Cuando veas un número grande como `6000000000000`, pregúntate "¿qué representa?"

2. **Divide para convertir a humano**:

   ```
   6_000_000_000_000 / 100_000_000 = 60,000 ($60k)
   ```

3. **Multiplica para convertir a interno**:

   ```
   $60,000 × 100_000_000 = 6_000_000_000_000
   ```

4. **Health Factor es tu amigo**: Siempre debe ser >= 100 para estar seguro.

---

## ❓ Preguntas Frecuentes

### P: ¿Por qué no usar 18 decimales como ETH?

**R:** Bitcoin usa 8 decimales históricamente (satoshis). Mantenemos compatibilidad.

### P: ¿Qué pasa si HF = 100 exactamente?

**R:** Técnicamente saludable, pero muy arriesgado. Cualquier pequeña caída te liquida.

### P: ¿Puedo cambiar el umbral de liquidación?

**R:** Sí, en el constructor. Más alto = más seguro pero menos puedes pedir.

### P: ¿Por qué el liquidador gana dinero?

**R:** Es el incentivo para que alguien liquide posiciones malas y proteja el protocolo.

---

## 🎯 Ejercicio para Practicar

Calcula el Health Factor para:

- Colateral: 2 BTC
- Precio BTC: $50,000
- Deuda: $60,000
- Umbral: 80%

<details>
<summary>Ver Solución</summary>

```
1. Valor del colateral:
   (200_000_000 × 5000000000000) / 100_000_000 = 10_000_000_000_000 ($100,000)

2. Colateral ajustado:
   (10_000_000_000_000 × 8000) / 10000 = 8_000_000_000_000 ($80,000)

3. Health Factor:
   (8_000_000_000_000 × 100) / 6_000_000_000_000 = 133

Resultado: HF = 133 ✅ (Saludable)
```

</details>

---

¿Ahora tiene más sentido? 🎓
