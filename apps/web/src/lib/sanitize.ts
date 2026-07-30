"use client";

import DOMPurify from "dompurify";

// tags HTML permitidos para contenido enriquecido
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "h1",
  "h2",
  "h3",
  "a",
  "img",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "blockquote",
  "code",
  "pre",
  "span",
  "div",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "width",
  "height",
  "class",
];

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

// Espejo EXACTO de la allowlist del backend para los bloques informativos del
// formulario (SANITIZE_INFORMATIVO en apps/api/src/modules/formulario/formulario.service.ts).
// Se usa en la vista previa del builder, donde el contenido aun no paso por el
// backend: si aqui permitieramos mas etiquetas, la vista previa mostraria cosas
// que el guardado va a borrar. Si cambia la lista del backend, cambiar esta tambien.
const INFORMATIVO_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a",
  "h3", "h4", "h5", "span", "blockquote", "table", "thead", "tbody", "tr", "td", "th",
];

const INFORMATIVO_ATTR = ["href", "target", "rel"];

export function sanitizeInformativo(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: INFORMATIVO_TAGS,
    ALLOWED_ATTR: INFORMATIVO_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}
