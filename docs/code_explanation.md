# 📝 Explicación del Código: BTCLending

Esta guía explica las partes más importantes del código que creamos, con comentarios en español.

---

## 📄 Archivo 1: `lib.cairo` - Contrato Principal de Lending

### Interfaz del Contrato

```cairo
#[starknet::interface]
pub trait IBTCLending<TContractState> {
    fn deposit_collateral(ref self: TContractState, amount: u256);
    fn borrow(ref self: TContractState, amount: u256);
    fn liquidate(ref self: TContractState, user: ContractAddress);
    fn calculate_health_factor(self: @TContractState, user: ContractAddress) -> u256;
    fn get_user_collateral(self: @TContractState, user: ContractAddress) -> u256;
    fn get_user_debt(self: @TContractState, user: ContractAddress) -> u256;
    fn set_oracle_price(ref self: TContractState, price: u256);
}
```

**Explicación:**

- `#[starknet::interface]`: Define la interfaz pública del contrato
- `ref self`: Funciones que **modifican** el estado (escriben en storage)
- `@TContractState`: Funciones de **solo lectura** (no modifican nada)
- `u256`: Tipo de dato para números grandes (256 bits)

---

### Storage (Almacenamiento)

```cairo
#[storage]
struct Storage {
    user_collateral: Map<ContractAddress, u256>,  // Colateral de cada usuario
    user_debt: Map<ContractAddress, u256>,        // Deuda de cada usuario
    wbtc_token: ContractAddress,                  // Dirección del token wBTC
    liquidation_threshold: u256,                  // Umbral de liquidación (8000 = 80%)
    oracle_price: u256,                           // Precio actual de BTC en USD
}
```

**Explicación:**

- `Map<ContractAddress, u256>`: Como un diccionario/hashmap
  - Clave: Dirección del usuario
  - Valor: Cantidad (colateral o deuda)
- `ContractAddress`: Tipo para direcciones de contratos/usuarios
- Cada variable se guarda permanentemente en la blockchain

---

### Constructor

```cairo
#[constructor]
fn constructor(
    ref self: ContractState,
    wbtc_token: ContractAddress,
    liquidation_threshold: u256,
) {
    // Guardar la dirección del token wBTC
    self.wbtc_token.write(wbtc_token);

    // Guardar el umbral de liquidación (ej: 8000 = 80%)
    self.liquidation_threshold.write(liquidation_threshold);

    // Precio inicial de BTC: $60,000
    self.oracle_price.write(6000000000000);
}
```

**Explicación:**

- Se ejecuta UNA SOLA VEZ cuando se despliega el contrato
- `.write()`: Escribe un valor en el storage
- Inicializa las variables del contrato

---

### Función: `deposit_collateral`

```cairo
fn deposit_collateral(ref self: ContractState, amount: u256) {
    // 1. Obtener quién está llamando la función
    let caller = get_caller_address();

    // 2. Obtener la dirección de este contrato
    let contract_vault = get_contract_address();

    // 3. Crear un "dispatcher" para interactuar con el token wBTC
    let token_dispatcher = IERC20Dispatcher {
        contract_address: self.wbtc_token.read()
    };

    // 4. Transferir wBTC del usuario a este contrato
    // (El usuario debe haber hecho "approve" antes)
    token_dispatcher.transfer_from(caller, contract_vault, amount);

    // 5. Actualizar el colateral del usuario en nuestro storage
    let current_collateral = self.user_collateral.read(caller);
    self.user_collateral.write(caller, current_collateral + amount);
}
```

**Explicación paso a paso:**

1. **`get_caller_address()`**: Obtiene la dirección de quien llamó la función
2. **`get_contract_address()`**: Obtiene la dirección de este contrato
3. **`IERC20Dispatcher`**: Permite llamar funciones del token wBTC
4. **`transfer_from`**: Mueve tokens del usuario al contrato
   - Requiere que el usuario haya hecho `approve` primero
5. **`.read()` y `.write()`**: Lee y escribe en el storage

**Flujo de tokens:**

```
Usuario → approve(lending_contract, amount)
Usuario → deposit_collateral(amount)
  ↓
wBTC se mueve de: Usuario → Contrato de Lending
  ↓
Storage actualizado: user_collateral[usuario] += amount
```

---

### Función: `borrow`

```cairo
fn borrow(ref self: ContractState, amount: u256) {
    // 1. Obtener quién está pidiendo prestado
    let caller = get_caller_address();

    // 2. Actualizar la deuda del usuario
    let current_debt = self.user_debt.read(caller);
    self.user_debt.write(caller, current_debt + amount);

    // 3. Verificar que el Health Factor sea >= 100
    let health_factor = self.calculate_health_factor(caller);
    assert(health_factor >= 100, 'Health factor too low');

    // NOTA: En producción, aquí transferirías USDC/stablecoins al usuario
    // Por ahora solo actualizamos la deuda
}
```

**Explicación:**

- **`assert(condición, mensaje)`**: Si la condición es falsa, revierte la transacción
- **Orden importante**: Primero actualiza la deuda, LUEGO verifica el HF
- Si HF < 100, la transacción falla y todo se revierte (no se guarda nada)

**¿Por qué verificar DESPUÉS de actualizar?**

```
Si verificamos ANTES:
  HF actual = 160 ✅
  Actualizamos deuda
  HF nuevo = 80 ❌ (pero ya es tarde!)

Si verificamos DESPUÉS:
  Actualizamos deuda
  HF nuevo = 80 ❌
  assert falla → TODO se revierte ✅
```

---

### Función: `calculate_health_factor`

```cairo
fn calculate_health_factor(self: @ContractState, user: ContractAddress) -> u256 {
    // 1. Leer el colateral y deuda del usuario
    let collateral = self.user_collateral.read(user);
    let debt = self.user_debt.read(user);

    // 2. Si no hay deuda, retornar un número muy alto (infinito)
    if debt == 0 {
        return 999_999_999;
    }

    // 3. Obtener el precio actual de BTC
    let btc_price = self.oracle_price.read();

    // 4. Convertir colateral BTC a USD
    // Dividimos entre 10^8 porque BTC tiene 8 decimales
    let collateral_value_usd = (collateral * btc_price) / 100_000_000;

    // 5. Aplicar el umbral de liquidación (80%)
    let collateral_adjusted = (collateral_value_usd * self.liquidation_threshold.read()) / 10000;

    // 6. Calcular Health Factor
    // Multiplicamos por 100 para evitar decimales
    (collateral_adjusted * 100) / debt
}
```

**Explicación matemática:**

**Ejemplo con números:**

```
collateral = 100_000_000 (1 BTC)
btc_price = 6000000000000 ($60,000)
debt = 3_000_000_000_000 ($30,000)
liquidation_threshold = 8000 (80%)

Paso 4:
collateral_value_usd = (100_000_000 × 6000000000000) / 100_000_000
                     = 6_000_000_000_000

Paso 5:
collateral_adjusted = (6_000_000_000_000 × 8000) / 10000
                    = 4_800_000_000_000

Paso 6:
health_factor = (4_800_000_000_000 × 100) / 3_000_000_000_000
              = 160
```

**¿Por qué dividir entre 100_000_000?**

- BTC tiene 8 decimales
- Al multiplicar `collateral × btc_price`, obtenemos escala doble (10^16)
- Dividimos entre 10^8 para volver a escala normal (10^8)

**¿Por qué multiplicar por 100 al final?**

- Para evitar decimales
- En lugar de HF = 1.6, tenemos HF = 160
- Más fácil de comparar: `if (hf >= 100)` en lugar de `if (hf >= 1.0)`

---

### Función: `liquidate`

```cairo
fn liquidate(ref self: ContractState, user: ContractAddress) {
    // 1. Verificar que el usuario esté liquidable
    let health_factor = self.calculate_health_factor(user);
    assert(health_factor < 100, 'User is healthy');

    // 2. Obtener la deuda y colateral del usuario
    let debt = self.user_debt.read(user);
    let collateral = self.user_collateral.read(user);

    // 3. Obtener quién está liquidando
    let liquidator = get_caller_address();

    // 4. Transferir el colateral al liquidador
    let token_dispatcher = IERC20Dispatcher {
        contract_address: self.wbtc_token.read()
    };
    token_dispatcher.transfer(liquidator, collateral);

    // 5. Limpiar la posición del usuario
    self.user_debt.write(user, 0);
    self.user_collateral.write(user, 0);
}
```

**Explicación del flujo:**

```
ANTES:
Usuario: 1 BTC colateral, $30k deuda, HF = 93
Liquidador: $30k en wallet

DURANTE liquidate():
1. Verifica HF < 100 ✅
2. Transfiere 1 BTC → Liquidador
3. Limpia posición del usuario

DESPUÉS:
Usuario: 0 BTC, $0 deuda
Liquidador: 1 BTC (vale $35k), gastó $30k
Ganancia del liquidador: $5k
```

**NOTA IMPORTANTE:**
En este código simplificado, NO estamos:

- Cobrando los $30k al liquidador
- Transfiriendo los $30k al protocolo

En producción, deberías agregar:

```cairo
// Cobrar la deuda al liquidador
let usdc_dispatcher = IERC20Dispatcher { contract_address: usdc_address };
usdc_dispatcher.transfer_from(liquidator, contract_vault, debt);
```

---

## 📄 Archivo 2: `erc20_mock.cairo` - Token wBTC de Prueba

### Función: `transfer_from`

```cairo
fn transfer_from(
    ref self: ContractState,
    sender: ContractAddress,
    recipient: ContractAddress,
    amount: u256
) -> bool {
    // 1. Obtener quién está llamando (debe ser un contrato aprobado)
    let caller = get_caller_address();

    // 2. Verificar que el caller tenga permiso (allowance)
    let current_allowance = self.allowances.read((sender, caller));
    assert(current_allowance >= amount, 'Insufficient allowance');

    // 3. Reducir el allowance
    self.allowances.write((sender, caller), current_allowance - amount);

    // 4. Hacer la transferencia
    self._transfer(sender, recipient, amount);

    true
}
```

**Explicación del patrón "approve + transfer_from":**

```
Paso 1: Usuario hace approve
  usuario.approve(lending_contract, 100 BTC)
  ↓
  allowances[usuario][lending_contract] = 100 BTC

Paso 2: Lending contract hace transfer_from
  lending.transfer_from(usuario, lending, 1 BTC)
  ↓
  Verifica: allowances[usuario][lending] >= 1 BTC ✅
  ↓
  Reduce allowance: 100 - 1 = 99 BTC
  ↓
  Transfiere: usuario → lending (1 BTC)
```

**¿Por qué este patrón?**

- Seguridad: El contrato no puede tomar tus tokens sin permiso
- Control: Tú decides cuánto puede gastar el contrato
- Estándar: Todos los tokens ERC20 funcionan así

---

### Función: `mint` (Solo para testing)

```cairo
fn mint(ref self: ContractState, to: ContractAddress, amount: u256) {
    // 1. Aumentar el balance del usuario
    let current_balance = self.balances.read(to);
    self.balances.write(to, current_balance + amount);

    // 2. Aumentar el supply total
    let current_supply = self.total_supply.read();
    self.total_supply.write(current_supply + amount);

    // 3. Emitir evento de Transfer
    let zero_address = starknet::contract_address_const::<0>();
    self.emit(Transfer { from: zero_address, to, value: amount });
}
```

**Explicación:**

- **`mint`**: Crea tokens de la nada (solo para testing)
- En producción, esta función estaría protegida o no existiría
- **Evento `Transfer`**: Registra la creación de tokens
  - `from: 0x0` indica que son tokens nuevos (no vienen de nadie)

---

## 📄 Archivo 3: `test_contract.cairo` - Tests

### Test: `test_deposit_collateral_with_mock`

```cairo
#[test]
fn test_deposit_collateral_with_mock() {
    // 1. SETUP: Desplegar contratos
    let wbtc_address = deploy_mock_wbtc();
    let lending_address = deploy_lending_contract(wbtc_address);

    // 2. SETUP: Crear usuario y cantidad
    let user: ContractAddress = contract_address_const::<0x789>();
    let deposit_amount: u256 = 100_000_000; // 1 BTC

    // 3. ARRANGE: Mintear wBTC al usuario
    let wbtc_dispatcher = IERC20MockDispatcher { contract_address: wbtc_address };
    wbtc_dispatcher.mint(user, deposit_amount);

    // 4. ARRANGE: Usuario aprueba el lending contract
    start_cheat_caller_address(wbtc_address, user);
    wbtc_dispatcher.approve(lending_address, deposit_amount);
    stop_cheat_caller_address(wbtc_address);

    // 5. ACT: Usuario deposita colateral
    start_cheat_caller_address(lending_address, user);
    let lending_dispatcher = IBTCLendingDispatcher { contract_address: lending_address };
    lending_dispatcher.deposit_collateral(deposit_amount);
    stop_cheat_caller_address(lending_address);

    // 6. ASSERT: Verificar que el colateral se registró
    let user_collateral = lending_dispatcher.get_user_collateral(user);
    assert(user_collateral == deposit_amount, 'Collateral not deposited');

    // 7. ASSERT: Verificar que el wBTC se transfirió
    let contract_balance = wbtc_dispatcher.balance_of(lending_address);
    assert(contract_balance == deposit_amount, 'wBTC not transferred');
}
```

**Explicación de los cheat codes:**

**`start_cheat_caller_address(contract, fake_caller)`**

- Hace que el `contract` piense que `fake_caller` está llamando
- Solo funciona en tests
- Permite simular diferentes usuarios

**Ejemplo:**

```cairo
// Sin cheat code:
wbtc.approve(lending, 100);  // El caller es TÚ (el test)

// Con cheat code:
start_cheat_caller_address(wbtc, alice);
wbtc.approve(lending, 100);  // El caller es ALICE
stop_cheat_caller_address(wbtc);
```

---

### Test: `test_liquidation_after_price_drop`

```cairo
#[test]
fn test_liquidation_after_price_drop() {
    // ... setup ...

    // 1. Usuario deposita y pide prestado
    lending_dispatcher.deposit_collateral(deposit_amount);
    lending_dispatcher.borrow(borrow_amount);

    // 2. Verificar HF inicial
    let initial_hf = lending_dispatcher.calculate_health_factor(user);
    assert(initial_hf >= 100, 'Should be healthy initially');

    // 3. SIMULAR CAÍDA DE PRECIO
    lending_dispatcher.set_oracle_price(4500000000000); // $45k

    // 4. Verificar que ahora está liquidable
    let new_hf = lending_dispatcher.calculate_health_factor(user);
    assert(new_hf < 100, 'Should be unhealthy now');

    // 5. Liquidador ejecuta liquidación
    start_cheat_caller_address(lending_address, liquidator);
    lending_dispatcher.liquidate(user);
    stop_cheat_caller_address(lending_address);

    // 6. Verificar resultados
    assert(lending_dispatcher.get_user_collateral(user) == 0, 'Collateral should be 0');
    assert(wbtc_dispatcher.balance_of(liquidator) == deposit_amount, 'Liquidator should get BTC');
}
```

**Explicación del flujo del test:**

1. Usuario empieza saludable (HF = 120)
2. Cambiamos el precio manualmente con `set_oracle_price`
3. Ahora HF = 90 (liquidable)
4. Simulamos que un liquidador ejecuta la liquidación
5. Verificamos que el usuario perdió su colateral
6. Verificamos que el liquidador recibió el BTC

---

## 🎓 Conceptos Clave de Cairo

### 1. `ref self` vs `@TContractState`

```cairo
// Modifica el estado (escribe en storage)
fn deposit(ref self: ContractState, amount: u256) {
    self.balance.write(amount); // ✅ Puede escribir
}

// Solo lectura (no modifica nada)
fn get_balance(self: @ContractState) -> u256 {
    self.balance.read() // ✅ Solo lee
    // self.balance.write(100); // ❌ ERROR: no puede escribir
}
```

### 2. `Map` (Diccionario/HashMap)

```cairo
// Declaración
user_balances: Map<ContractAddress, u256>

// Escribir
self.user_balances.write(alice, 1000);

// Leer
let balance = self.user_balances.read(alice); // 1000
```

### 3. `assert` (Verificación)

```cairo
assert(condition, 'Error message');

// Si condition = true → continúa
// Si condition = false → revierte TODO y muestra el mensaje
```

### 4. Eventos

```cairo
#[event]
#[derive(Drop, starknet::Event)]
enum Event {
    Transfer: Transfer,
}

#[derive(Drop, starknet::Event)]
struct Transfer {
    from: ContractAddress,
    to: ContractAddress,
    value: u256,
}

// Emitir evento
self.emit(Transfer { from: alice, to: bob, value: 100 });
```

---

## 💡 Mejores Prácticas

### 1. Verificar DESPUÉS de modificar

```cairo
// ❌ MAL
let hf = calculate_health_factor(user);
assert(hf >= 100, 'Too low');
self.user_debt.write(user, new_debt);

// ✅ BIEN
self.user_debt.write(user, new_debt);
let hf = calculate_health_factor(user);
assert(hf >= 100, 'Too low');
```

### 2. Usar `assert` para validaciones

```cairo
// Siempre verifica condiciones críticas
assert(amount > 0, 'Amount must be positive');
assert(balance >= amount, 'Insufficient balance');
```

### 3. Emitir eventos importantes

```cairo
// Los eventos ayudan a rastrear lo que pasa
self.emit(Deposit { user, amount });
self.emit(Liquidation { user, liquidator, amount });
```

---

¿Hay alguna parte específica del código que quieras que explique con más detalle?
