export function Logo({ size = 40 }: { size?: number }) {
  return <img src="/icon.svg" width={size} height={size} alt="" className="rounded-[22%]" />;
}
