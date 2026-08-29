export default function BrandMark({ className = '' }: { className?: string }) {
  return <span className={`brand-mark ${className}`.trim()} aria-hidden="true"><img src="/rentwise-mark.png" alt="" /></span>;
}
