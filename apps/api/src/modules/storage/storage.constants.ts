import { join } from 'path';

// Carpeta donde multer deja el archivo mientras se sube, antes de validarlo.
//
// Vive al lado de "uploads", no dentro: asi comparte disco (mover el archivo a
// su sitio es un rename instantaneo, sin copiar 100 MB) pero queda fuera de
// cualquier carpeta que se sirva por web.
//
// Lo que quede aqui es basura de una subida que fallo; el servicio lo borra.
export const STORAGE_TEMP_DIR = join(process.cwd(), 'uploads-tmp');
