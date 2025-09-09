export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-[1500px] mx-auto flex flex-col gap-12 items-center">{children}</div>
  );
}