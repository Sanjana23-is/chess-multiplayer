export const Button = ({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) => {
  return (
    <button
      onClick={onClick}
     className="px-8 py-3 text-lg font-semibold rounded-xl 
           bg-white/10 hover:bg-white/20 
           backdrop-blur-md 
           border border-white/20 
           text-white 
           transition-all duration-200 
           shadow-lg active:scale-95"

    >
      {children}
    </button>
  );
};
