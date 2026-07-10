// La "estrella" de la marca (EstrellaSinFondo.png del material) no es una
// estrella de puntas: es una cruz de brazos redondeados, con el brazo al 26%
// del ancho. Se reproduce con dos rectangulos redondeados cruzados, asi que
// pesa ~150 bytes, escala sin perder nitidez y hereda el color con currentColor.
export function EstrellaSuperStar({
  tam,
  className,
  style,
}: {
  tam: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <rect x="8.9" y="0" width="6.2" height="24" rx="3.1" />
      <rect x="0" y="8.9" width="24" height="6.2" rx="3.1" />
    </svg>
  );
}
