import { useLocation } from "react-router-dom";

const Placeholder = () => {
  const location = useLocation();
  const name = location.pathname.replace("/", "").charAt(0).toUpperCase() + location.pathname.slice(2);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-5">
      <div className="text-center">
        <h1 className="text-xl font-bold text-foreground">{name}</h1>
        <p className="text-sm text-muted-foreground mt-2">Coming soon in the next update.</p>
      </div>
    </div>
  );
};

export default Placeholder;
