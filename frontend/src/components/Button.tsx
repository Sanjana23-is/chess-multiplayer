export const Button = ({
  onClick,
  children,
  className = "",
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative overflow-hidden px-8 py-4 text-lg font-bold rounded-2xl bg-white text-[#0a0a0a] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_-10px_rgba(16,185,129,0.4)] active:scale-95 shadow-[0_0_40px_-10px_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-100 to-cyan-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative flex items-center justify-center gap-2">
        {children}
      </div>
    </button>
  );
};
