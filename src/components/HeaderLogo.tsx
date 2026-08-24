import React from "react";

export default function HeaderLogo() {
  return (
    <div className="flex items-center gap-2 select-none shrink-0 py-0.5">
      <svg 
        viewBox="0 0 350 100" 
        className="h-6 sm:h-7 w-auto object-contain block" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Official Colsubsidio Yellow Tangram Emblem */}
        <g id="colsubsidio-tangram">
          {/* Far Left Arrow Point Triangle */}
          <polygon points="0,50 32,18 32,82" fill="#FFC700" />
          
          {/* Middle Square */}
          <polygon points="36,18 68,18 68,50 36,50" fill="#FFC700" />
          
          {/* Middle Lower Right Triangle */}
          <polygon points="36,54 68,54 36,86" fill="#FFC700" />
          
          {/* Upper Right Large Wing Triangle */}
          <polygon points="36,0 86,0 36,50" fill="#FFC700" />
          
          {/* Lower Right Large Wing Triangle */}
          <polygon points="36,50 86,100 36,100" fill="#FFC700" />
        </g>

        {/* White Colsubsidio Typography matching original brand logotype */}
        <text 
          x="98" 
          y="66" 
          fill="#FFFFFF" 
          fontFamily="'Arial', 'Trebuchet MS', system-ui, -apple-system, sans-serif" 
          fontWeight="700" 
          fontSize="44" 
          letterSpacing="-0.8"
        >
          Colsubsidio
        </text>
      </svg>
    </div>
  );
}

