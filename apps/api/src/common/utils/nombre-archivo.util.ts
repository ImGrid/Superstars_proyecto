// Corrige el nombre de un archivo subido.
//
// multer 2.0.2 crea busboy sin pasarle defParamCharset, asi que busboy usa su
// decodificador nulo y arma el nombre byte a byte con latin1Slice. Un nombre en
// UTF-8 (con tildes o ene) llega deformado: "Agroecologica" se ve como
// "AgroecolA3gica". Se nota en la lista de adjuntos y en el nombre con el que
// se descarga el archivo.
//
// Recuperamos los bytes tal como llegaron y los leemos como UTF-8. Si no forman
// UTF-8 valido devolvemos el nombre original: preferimos dejarlo como estaba
// antes que romperlo mas.
export function corregirNombreArchivo(nombre: string): string {
  const bytes = Buffer.from(nombre, 'latin1');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return nombre;
  }
}
