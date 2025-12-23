# 📚 Documentación del Proyecto BTCFi Lending

Bienvenido a la documentación completa del proyecto. Aquí encontrarás guías educativas detalladas para entender cada aspecto del protocolo de lending.

---

## 📖 Guías Disponibles

### 1. [🔢 Guía de Decimales y Matemáticas](./decimals_guide.md)

**Lo que aprenderás:**

- ¿Por qué necesitamos decimales en blockchain?
- Cómo funciona la escala de 8 decimales del Bitcoin
- Conversión de BTC a USD
- Cálculo del Health Factor paso a paso
- Ejemplos completos con números reales

**Nivel:** Principiante-Intermedio  
**Tiempo:** ~15 minutos

---

### 2. [💥 Guía de Liquidaciones](./liquidation_guide.md)

**Lo que aprenderás:**

- ¿Qué es una liquidación y por qué existe?
- Escenario completo con Alice y Bob
- Flujo de dinero en una liquidación
- Cómo los liquidadores ganan dinero
- Cómo evitar ser liquidado

**Nivel:** Intermedio  
**Tiempo:** ~10 minutos

---

### 3. [📝 Explicación del Código](./code_explanation.md)

**Lo que aprenderás:**

- Explicación línea por línea del contrato principal
- Cómo funciona el Mock ERC20
- Análisis de los tests
- Conceptos clave de Cairo (`ref self`, `Map`, `assert`)
- Mejores prácticas

**Nivel:** Intermedio-Avanzado  
**Tiempo:** ~20 minutos

---

## 🎯 Ruta de Aprendizaje Recomendada

Si eres nuevo en DeFi o Cairo, te recomendamos seguir este orden:

```
1. Decimales y Matemáticas
   ↓
2. Liquidaciones
   ↓
3. Explicación del Código
```

---

## 🚀 Inicio Rápido

Si solo quieres entender lo básico rápidamente:

1. **Lee la sección "Health Factor"** en [decimals_guide.md](./decimals_guide.md)
2. **Mira el diagrama** en [liquidation_guide.md](./liquidation_guide.md)
3. **Revisa el código comentado** en los archivos `.cairo` del proyecto

---

## 💡 Recursos Adicionales

- **Código fuente**: `../src/lib.cairo` (todo comentado en español)
- **Tests**: `../tests/test_contract.cairo` (con explicaciones)
- **README principal**: `../README.md`

---

## 🤝 ¿Tienes Preguntas?

Si algo no está claro o quieres más detalles:

- Abre un issue en GitHub
- Revisa la sección de FAQ en cada guía
- Contacta al autor

---

**¡Feliz aprendizaje! 🎓**
