import { produce } from "immer";
import type { SchemaDefinition, Seccion, FormField } from "@superstars/shared";

// acciones del reducer
export type SchemaAction =
  | { type: "SET_SCHEMA"; payload: SchemaDefinition }
  | { type: "ADD_SECCION"; payload: Omit<Seccion, "campos"> }
  | { type: "UPDATE_SECCION"; payload: { id: string; changes: Partial<Pick<Seccion, "titulo" | "descripcion">> } }
  | { type: "DELETE_SECCION"; payload: { id: string } }
  | { type: "REORDER_SECCION"; payload: { id: string; direction: "up" | "down" } }
  | { type: "ADD_CAMPO"; payload: { seccionId: string; campo: FormField } }
  | { type: "UPDATE_CAMPO"; payload: { seccionId: string; campoId: string; campo: FormField } }
  | { type: "DELETE_CAMPO"; payload: { seccionId: string; campoId: string } }
  | { type: "REORDER_CAMPO"; payload: { seccionId: string; campoId: string; direction: "up" | "down" } };

// recalcula ordenes 1-based
function recalcOrden<T extends { orden: number }>(items: T[]) {
  items.forEach((item, i) => {
    item.orden = i + 1;
  });
}

// swap dos elementos por indice
function swap<T>(arr: T[], a: number, b: number) {
  if (a < 0 || b < 0 || a >= arr.length || b >= arr.length) return;
  const tmp = arr[a];
  arr[a] = arr[b];
  arr[b] = tmp;
}

export function schemaReducer(
  state: SchemaDefinition,
  action: SchemaAction,
): SchemaDefinition {
  return produce(state, (draft) => {
    switch (action.type) {
      case "SET_SCHEMA": {
        draft.secciones = action.payload.secciones;
        break;
      }

      case "ADD_SECCION": {
        draft.secciones.push({ ...action.payload, campos: [] });
        recalcOrden(draft.secciones);
        break;
      }

      case "UPDATE_SECCION": {
        const sec = draft.secciones.find((s) => s.id === action.payload.id);
        if (!sec) break;
        Object.assign(sec, action.payload.changes);
        break;
      }

      case "DELETE_SECCION": {
        const idx = draft.secciones.findIndex((s) => s.id === action.payload.id);
        if (idx === -1) break;
        draft.secciones.splice(idx, 1);
        recalcOrden(draft.secciones);
        break;
      }

      case "REORDER_SECCION": {
        const idx = draft.secciones.findIndex((s) => s.id === action.payload.id);
        const target = action.payload.direction === "up" ? idx - 1 : idx + 1;
        swap(draft.secciones, idx, target);
        recalcOrden(draft.secciones);
        break;
      }

      case "ADD_CAMPO": {
        const sec = draft.secciones.find((s) => s.id === action.payload.seccionId);
        if (sec) {
          // spread para evitar frozen refs de Immer en strict mode
          sec.campos.push({ ...action.payload.campo });
          recalcOrden(sec.campos);
        }
        break;
      }

      case "UPDATE_CAMPO": {
        const sec = draft.secciones.find((s) => s.id === action.payload.seccionId);
        if (!sec) break;
        const idx = sec.campos.findIndex((c) => c.id === action.payload.campoId);
        if (idx === -1) break;

        const existing = sec.campos[idx];
        // preservar tipo y fijo del campo original (tipo no se puede cambiar)
        sec.campos[idx] = { ...action.payload.campo, orden: existing.orden, tipo: existing.tipo, fijo: existing.fijo } as FormField;
        break;
      }

      case "DELETE_CAMPO": {
        const sec = draft.secciones.find((s) => s.id === action.payload.seccionId);
        if (!sec) break;
        const idx = sec.campos.findIndex((c) => c.id === action.payload.campoId);
        if (idx === -1) break;
        sec.campos.splice(idx, 1);
        recalcOrden(sec.campos);
        break;
      }

      case "REORDER_CAMPO": {
        const sec = draft.secciones.find((s) => s.id === action.payload.seccionId);
        if (sec) {
          const idx = sec.campos.findIndex((c) => c.id === action.payload.campoId);
          const target = action.payload.direction === "up" ? idx - 1 : idx + 1;
          swap(sec.campos, idx, target);
          recalcOrden(sec.campos);
        }
        break;
      }
    }
  });
}

// estado inicial vacio
export const emptySchema: SchemaDefinition = { secciones: [] };
