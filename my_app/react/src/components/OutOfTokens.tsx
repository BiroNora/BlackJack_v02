import "../styles/loading.css";

export function OutOfTokens() {
  return (
    <div className="container-headins">
      <h1 className="animated-dots-heading">
        O U T of T O K E N S<span className="dot dot-1">.</span>
        <span className="dot dot-2">.</span>
        <span className="dot dot-3">.</span>
      </h1>
      <div className="bank3 merriweather">Restart in 5sec</div>
    </div>
  );
}
