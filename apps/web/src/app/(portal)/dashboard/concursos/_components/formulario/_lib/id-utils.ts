import { nanoid } from "nanoid";

// generadores de IDs con prefijos legibles
export const seccionId = () => `sec_${nanoid(8)}`;
export const campoId = () => `campo_${nanoid(8)}`;
export const opcionId = () => `opt_${nanoid(6)}`;
export const columnaId = () => `col_${nanoid(6)}`;
