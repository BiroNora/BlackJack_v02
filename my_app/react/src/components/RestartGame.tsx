import "../styles/loading.css";
import React from "react";

interface RestartProps {
  currTokens: number;
}

const Restart: React.FC<RestartProps> = ({currTokens}) => {

  return (
    <div className="loading-container-centered">
      <div>
        <h1 className="animated-dots-heading">W E L C O M E  B A C K</h1>
        <div className="bank3 merriweather">Your New Tokens: {currTokens}</div>
        <div>
          <div className="bank2 merriweather">
            <span className="grey-suit star-right">&#9733;&#9733;&#9733;</span>
            <span className="red-suit gap-right">♥</span>
            <span className="black-suit gap-right">♠</span>
            <div>Enjoy Your Game</div>
            <span className="black-suit gap-left">♣</span>
            <span className="red-suit gap-left">♦</span>
            <span className="grey-suit star-left">&#9733;&#9733;&#9733;</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Restart;
