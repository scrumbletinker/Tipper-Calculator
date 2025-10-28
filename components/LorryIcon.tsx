
import React from 'react';

const LorryIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10 17h4V5H2v12h3" />
    <path d="M2 17h13.1" />
    <path d="M18 17H10" />
    <path d="M18 17h2v-5h2l-2-7h-4V5" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="18" cy="17" r="2" />
  </svg>
);

export default LorryIcon;
