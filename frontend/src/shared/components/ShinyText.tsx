// TODO: болванка (react-bits ShinyText), заменить на финальный дизайн
export default function ShinyText({
  text,
  className,
  color,
}: {
  text: string;
  className?: string;
  color?: string;
  shineColor?: string;
  speed?: number;
}) {
  return (
    <span className={className} style={{ color }}>
      {text}
    </span>
  );
}
