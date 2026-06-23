# Convención de commits VOY

Formato obligatorio: `tipo(scope): descripción`

## Tipos válidos
- `fix` — corrige un bug
- `feat` — agrega funcionalidad
- `config` — cambia configuración (wrangler, env, CI)
- `remove` — elimina código o archivos
- `refactor` — reorganiza sin cambiar comportamiento
- `deploy` — deploy a prod sin cambios de código

## Reglas
1. El mensaje describe QUÉ cambió y POR QUÉ.
2. Se puede hacer `git revert` del commit sin romper otros.
3. Si alguna respuesta es NO → no commitear todavía.

## Prohibido
- UUIDs como mensaje (`f8c4ab38-...`)
- Mensajes sin contexto (`update`, `fix`, `wip`)
- Commits a main con trabajo incompleto
