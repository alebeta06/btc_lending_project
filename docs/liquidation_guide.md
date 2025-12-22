# 💥 Guía Completa: Liquidaciones en Protocolos de Lending

## 🎯 ¿Qué es una Liquidación?

Una **liquidación** es cuando alguien (el liquidador) paga la deuda de otra persona (el usuario) y a cambio se queda con su colateral.

**Piénsalo como un embargo bancario:**

- Tienes una casa (colateral)
- Debes dinero al banco (deuda)
- No puedes pagar
- El banco vende tu casa para recuperar su dinero

---

## 🖼️ Visualización del Proceso Completo

![Diagrama del proceso de liquidación](/home/alebeta/.gemini/antigravity/brain/c8f881c8-3572-4cd5-9cf5-309f71a761ad/liquidation_flow_diagram_1766363763351.png)

---

## 📖 Historia Completa: De Principio a Fin

### Personajes:

- **Alice** (Usuario que pide prestado)
- **Bob** (Liquidador - el que gana dinero)
- **Protocolo BTCLending** (El contrato inteligente)

---

## 🎬 Acto 1: Alice Pide Prestado (Todo va bien)

### Día 1: Alice deposita colateral

**Alice tiene:**

- 1 BTC en su wallet

**Precio de BTC:**

- $60,000 por BTC

**Alice hace:**

1. Deposita 1 BTC en el protocolo
2. Su colateral ahora vale: **$60,000**

```
┌─────────────────────────────┐
│   PROTOCOLO BTCLending      │
├─────────────────────────────┤
│ Colateral de Alice:         │
│ 1 BTC = $60,000            │
│ Deuda de Alice: $0          │
└─────────────────────────────┘
```

---

### Día 2: Alice pide prestado

**Alice piensa:**

- "Necesito $30,000 en efectivo pero no quiero vender mi BTC"
- "Voy a pedir prestado contra mi BTC"

**Alice hace:**

1. Pide prestado $30,000 del protocolo
2. El protocolo verifica: ¿Puede pedir $30,000?

**Cálculo del protocolo:**

```
Colateral: $60,000
Umbral de liquidación: 80%
Máximo que puede pedir: $60,000 × 80% = $48,000
Alice pide: $30,000 ✅ (Está bien, es menos de $48,000)
```

**Health Factor de Alice:**

```
HF = ($60,000 × 80% × 100) / $30,000
HF = ($48,000 × 100) / $30,000
HF = 4,800,000 / 30,000
HF = 160 ✅ (Saludable)
```

**Estado después:**

```
┌─────────────────────────────┐
│   PROTOCOLO BTCLending      │
├─────────────────────────────┤
│ Colateral de Alice:         │
│ 1 BTC = $60,000            │
│ Deuda de Alice: $30,000     │
│ Health Factor: 160 ✅       │
└─────────────────────────────┘

Alice recibe: $30,000 en su wallet
```

---

## 💥 Acto 2: El Precio Cae (Comienza el Peligro)

### Día 10: BTC cae a $35,000

**¡Noticia!** El mercado de crypto cae. BTC ahora vale $35,000.

**Nuevo estado de Alice:**

```
Colateral: 1 BTC × $35,000 = $35,000 (antes era $60,000)
Deuda: $30,000 (NO CAMBIÓ - siempre debe $30,000)
```

**Nuevo Health Factor:**

```
HF = ($35,000 × 80% × 100) / $30,000
HF = ($28,000 × 100) / $30,000
HF = 2,800,000 / 30,000
HF = 93 ⚠️ (¡PELIGRO! Es menor a 100)
```

**Estado crítico:**

```
┌─────────────────────────────┐
│   PROTOCOLO BTCLending      │
├─────────────────────────────┤
│ Colateral de Alice:         │
│ 1 BTC = $35,000 ⚠️         │
│ Deuda de Alice: $30,000     │
│ Health Factor: 93 🔴        │
│ ⚠️ LIQUIDABLE ⚠️           │
└─────────────────────────────┘
```

---

## 🦸 Acto 3: Bob el Liquidador Aparece

### ¿Quién es Bob?

Bob es un **bot** o una persona que monitorea el protocolo buscando usuarios liquidables para ganar dinero.

**Bob ve:**

- Alice tiene HF = 93 (< 100)
- Alice debe $30,000
- Alice tiene 1 BTC como colateral
- 1 BTC ahora vale $35,000

**Bob calcula:**

```
Si pago la deuda de Alice ($30,000)
Recibo su colateral (1 BTC = $35,000)
Ganancia: $35,000 - $30,000 = $5,000 💰
```

---

## 💸 Acto 4: La Liquidación (Paso a Paso)

### Paso 1: Bob inicia la liquidación

**Bob llama a la función:**

```cairo
lending.liquidate(alice_address);
```

### Paso 2: El contrato verifica

```cairo
// 1. ¿Alice está liquidable?
let hf = calculate_health_factor(alice);
assert(hf < 100, 'User is healthy'); // ✅ 93 < 100

// 2. ¿Cuánto debe Alice?
let debt = user_debt.read(alice); // $30,000

// 3. ¿Cuánto colateral tiene?
let collateral = user_collateral.read(alice); // 1 BTC
```

### Paso 3: Transferencias

**El protocolo hace 2 cosas:**

**A) Bob paga la deuda de Alice:**

```
Bob → Protocolo: $30,000 en stablecoins
```

**B) Protocolo da el colateral a Bob:**

```
Protocolo → Bob: 1 BTC
```

### Paso 4: Limpiar la posición de Alice

```cairo
user_debt.write(alice, 0);        // Deuda = 0
user_collateral.write(alice, 0);  // Colateral = 0
```

---

## 📊 Flujo de Dinero Completo

### Antes de la Liquidación:

```
┌─────────────┐         ┌─────────────────┐         ┌─────────────┐
│    Alice    │         │   Protocolo     │         │     Bob     │
├─────────────┤         ├─────────────────┤         ├─────────────┤
│ Colateral:  │         │ Tiene:          │         │ Tiene:      │
│ 0 BTC       │         │ 1 BTC (Alice)   │         │ $30,000     │
│             │         │                 │         │             │
│ Deuda:      │         │ Debe a Alice:   │         │             │
│ $30,000     │         │ $30,000         │         │             │
│             │         │                 │         │             │
│ Tiene:      │         │                 │         │             │
│ $30,000     │         │                 │         │             │
│ (prestados) │         │                 │         │             │
└─────────────┘         └─────────────────┘         └─────────────┘
```

### Después de la Liquidación:

```
┌─────────────┐         ┌─────────────────┐         ┌─────────────┐
│    Alice    │         │   Protocolo     │         │     Bob     │
├─────────────┤         ├─────────────────┤         ├─────────────┤
│ Colateral:  │         │ Tiene:          │         │ Tiene:      │
│ 0 BTC ❌    │         │ 0 BTC           │         │ 1 BTC ✅    │
│             │         │ $30,000 ✅      │         │             │
│ Deuda:      │         │                 │         │ Gastó:      │
│ $0 ✅       │         │ Debe a Alice:   │         │ $30,000     │
│             │         │ $0 ✅           │         │             │
│ Tiene:      │         │                 │         │ Ganancia:   │
│ $30,000     │         │                 │         │ $5,000 💰   │
│ (aún)       │         │                 │         │             │
└─────────────┘         └─────────────────┘         └─────────────┘
```

---

## 🧮 Cálculo de Ganancia de Bob (Detallado)

### Inversión de Bob:

```
Pagó: $30,000 en stablecoins
```

### Lo que recibió Bob:

```
Recibió: 1 BTC
Valor actual de 1 BTC: $35,000
```

### Ganancia bruta:

```
$35,000 (valor del BTC) - $30,000 (lo que pagó) = $5,000
```

### Ganancia porcentual:

```
($5,000 / $30,000) × 100 = 16.67% de ganancia
```

**Bob ganó $5,000 en una sola transacción!** 💰

---

## 🎭 ¿Qué le pasó a Alice?

### Lo que Alice perdió:

- ❌ Su 1 BTC (que ahora vale $35,000)

### Lo que Alice conservó:

- ✅ Los $30,000 que pidió prestados (aún los tiene)
- ✅ Su deuda está en $0 (ya no debe nada)

### Pérdida neta de Alice:

```
Perdió: 1 BTC = $35,000
Conservó: $30,000
Pérdida real: $35,000 - $30,000 = $5,000
```

**Alice perdió $5,000 de valor.**

---

## 🤔 ¿Por qué existe esto?

### Protección del Protocolo

Imagina que NO existieran las liquidaciones:

**Escenario sin liquidaciones:**

```
Alice debe: $30,000
Su colateral vale: $35,000 (hoy)
```

**Si BTC sigue cayendo a $25,000:**

```
Alice debe: $30,000
Su colateral vale: $25,000
```

**¡El protocolo pierde dinero!** El colateral ya no cubre la deuda.

### Con liquidaciones:

- Bob liquida cuando BTC = $35,000
- El protocolo recupera sus $30,000
- El protocolo está protegido ✅

---

## 💡 Ejemplo con Números Más Grandes

### Escenario 2: Alice deposita 10 BTC

**Día 1:**

```
Colateral: 10 BTC × $60,000 = $600,000
Pide prestado: $400,000
HF = ($600,000 × 80% × 100) / $400,000 = 120 ✅
```

**Día 10: BTC cae a $48,000**

```
Colateral: 10 BTC × $48,000 = $480,000
Deuda: $400,000
HF = ($480,000 × 80% × 100) / $400,000 = 96 ⚠️
```

**Bob liquida:**

```
Bob paga: $400,000
Bob recibe: 10 BTC = $480,000
Ganancia de Bob: $480,000 - $400,000 = $80,000 💰💰💰
```

---

## 🎯 Ejemplo con Liquidación Parcial (Avanzado)

En protocolos más sofisticados como Aave, las liquidaciones pueden ser **parciales**.

### Escenario:

```
Colateral: 10 BTC = $350,000
Deuda: $300,000
HF = 93 (liquidable)
```

### Liquidación Parcial (50%):

```
Bob paga: $150,000 (50% de la deuda)
Bob recibe: 5 BTC = $175,000 (50% del colateral)
Ganancia de Bob: $25,000

Alice conserva:
- 5 BTC = $175,000
- Debe: $150,000
- Nuevo HF = 93 (aún liquidable, necesita más liquidación)
```

---

## 🚨 Cómo Alice Podría Haberse Salvado

### Opción 1: Agregar más colateral

```
Antes de que HF < 100:
Alice deposita 0.5 BTC más
Nuevo colateral: 1.5 BTC × $35,000 = $52,500
Nuevo HF = ($52,500 × 80% × 100) / $30,000 = 140 ✅
```

### Opción 2: Pagar parte de la deuda

```
Alice paga $10,000 de su deuda
Nueva deuda: $20,000
Nuevo HF = ($35,000 × 80% × 100) / $20,000 = 140 ✅
```

### Opción 3: Cerrar la posición antes

```
Cuando BTC = $50,000 (HF aún > 100):
Alice paga los $30,000
Recupera su 1 BTC
Vende el BTC por $50,000
Ganancia: $50,000 - $30,000 = $20,000 ✅
```

---

## 🤖 ¿Quiénes son los Liquidadores?

### En la práctica:

1. **Bots automatizados** (90% de las liquidaciones)

   - Monitorean el protocolo 24/7
   - Ejecutan liquidaciones en milisegundos
   - Compiten entre sí por las mejores oportunidades

2. **Traders profesionales** (10%)
   - Usan herramientas especializadas
   - Buscan liquidaciones grandes

### Herramientas que usan:

- Monitores de Health Factor
- Alertas automáticas
- Scripts de ejecución rápida

---

## 📝 Resumen Final

### Para el Usuario (Alice):

- ✅ Puede pedir prestado sin vender sus activos
- ⚠️ Debe monitorear su Health Factor
- ❌ Si HF < 100, pierde su colateral

### Para el Liquidador (Bob):

- ✅ Gana dinero liquidando posiciones malas
- ✅ Ayuda a proteger el protocolo
- ⚠️ Necesita capital para liquidar

### Para el Protocolo:

- ✅ Se protege de pérdidas
- ✅ Mantiene solvencia
- ✅ Incentiva a liquidadores con ganancias

---

## 🎓 Ejercicio Práctico

**Calcula la ganancia del liquidador:**

- Usuario deposita: 5 BTC
- Precio inicial BTC: $60,000
- Pide prestado: $200,000
- Precio cae a: $45,000
- Umbral: 80%

<details>
<summary>Ver Solución</summary>

```
1. Colateral inicial:
   5 BTC × $60,000 = $300,000

2. HF inicial:
   ($300,000 × 80% × 100) / $200,000 = 120 ✅

3. Después de caída:
   Colateral: 5 BTC × $45,000 = $225,000
   HF = ($225,000 × 80% × 100) / $200,000 = 90 ⚠️

4. Liquidación:
   Liquidador paga: $200,000
   Liquidador recibe: 5 BTC = $225,000
   Ganancia: $225,000 - $200,000 = $25,000 💰

5. Ganancia porcentual:
   ($25,000 / $200,000) × 100 = 12.5%
```

</details>

---

¿Ahora tiene más sentido cómo funcionan las liquidaciones? 💡
