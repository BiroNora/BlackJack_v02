import "../styles/loading.css";

export function Reloading() {
  return (
    <div className="loading-container-centered">
      <h1 className="animated-dots-heading">
        R E L O A D I N G<span className="dot dot-1">.</span>
        <span className="dot dot-2">.</span>
        <span className="dot dot-3">.</span>
      </h1>
    </div>
  );
}
