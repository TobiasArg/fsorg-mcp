# Plan: Distribución del MCP de Archivos Locales

## Fase 1: Configuración Externa

### 1.1 Crear sistema de configuración
- **Archivo**: `src/utils/config.ts`
- **Funcionalidad**:
  - Cargar configuración desde `~/.config/local-files-mcp/config.json`
  - Valores por defecto sensatos si no existe configuración
  - Validación de configuración con Zod
  - Auto-detección del directorio home del usuario

### 1.2 Actualizar safety.ts
- Eliminar rutas hardcodeadas
- Usar configuración dinámica
- Mantener rutas del sistema siempre protegidas (/, /etc, /usr, etc.)
- Permitir usuarios agregar sus propias rutas permitidas/protegidas

### 1.3 Comando de inicialización
- Tool `init_config` o script CLI para generar configuración inicial
- Detectar OS (macOS/Linux/Windows) y ajustar rutas por defecto

## Fase 2: Documentación

### 2.1 README.md completo
- Descripción del proyecto
- Requisitos (Node.js 18+, pnpm)
- Instalación paso a paso
- Configuración de Claude Desktop
- Lista de tools disponibles con ejemplos
- Configuración de seguridad

### 2.2 Archivo de configuración ejemplo
- `config.example.json` con todas las opciones documentadas

## Fase 3: Preparación para npm

### 3.1 Actualizar package.json
- Agregar campos: `bin`, `repository`, `keywords`, `engines`
- Configurar `files` para incluir solo lo necesario
- Script `postinstall` para crear configuración inicial

### 3.2 Agregar shebang y permisos
- Asegurar que `dist/index.js` sea ejecutable
- Agregar `#!/usr/bin/env node`

### 3.3 Crear .npmignore
- Excluir archivos de desarrollo

## Fase 4: Compatibilidad multiplataforma

### 4.1 Rutas multiplataforma
- Usar `os.homedir()` para detectar home
- Usar `path.join()` en lugar de concatenación de strings
- Rutas protegidas específicas por OS

### 4.2 Configuración por defecto por OS
- macOS: ~/Documents, ~/Desktop protegidos
- Linux: Similar a macOS
- Windows: C:\Users\{user}\Documents, etc.

## Fase 5: Testing y CI

### 5.1 Tests básicos
- Test de configuración
- Test de safety checks
- Test de tools principales

### 5.2 GitHub Actions (opcional)
- Build automático
- Publish a npm en tags

## Archivos a crear/modificar

```
src/
├── utils/
│   ├── config.ts      # NUEVO: Sistema de configuración
│   └── safety.ts      # MODIFICAR: Usar config dinámica
├── index.ts           # MODIFICAR: Inicializar config al inicio
config.example.json    # NUEVO: Ejemplo de configuración
README.md              # NUEVO: Documentación completa
.npmignore             # NUEVO: Archivos a excluir de npm
package.json           # MODIFICAR: Campos para npm
```

## Configuración de Claude Desktop

El usuario deberá agregar a `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "local-files": {
      "command": "node",
      "args": ["/ruta/al/dist/index.js"]
    }
  }
}
```

O si se publica en npm:

```json
{
  "mcpServers": {
    "local-files": {
      "command": "npx",
      "args": ["local-files-mcp"]
    }
  }
}
```

## Orden de ejecución

1. ✅ Fase 1.1: config.ts
2. ✅ Fase 1.2: Actualizar safety.ts
3. ✅ Fase 2.1: README.md
4. ✅ Fase 2.2: config.example.json
5. ✅ Fase 3.1-3.3: Preparar npm
6. ✅ Fase 4.1-4.2: Multiplataforma
7. ⏸️ Fase 5: Testing (opcional, después)

## Verificación final

- [ ] `pnpm build` sin errores
- [ ] Funciona sin configuración (usa defaults)
- [ ] Funciona con configuración personalizada
- [ ] README tiene instrucciones claras
- [ ] `npm pack` genera tarball correcto
