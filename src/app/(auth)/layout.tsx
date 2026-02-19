export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFF] relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="fixed top-0 w-full h-full pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-purple-100/30 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-100/20 blur-[120px] rounded-full"></div>
      </div>

      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
