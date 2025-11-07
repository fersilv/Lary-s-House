import React from 'react';

const CocktailIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 22V13"/>
    <path d="M12 13L20 5"/>
    <path d="M12 13L4 5"/>
    <path d="M4 5H20"/>
  </svg>
);

export default CocktailIcon;
