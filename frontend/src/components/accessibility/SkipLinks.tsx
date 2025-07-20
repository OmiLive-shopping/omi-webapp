import React from 'react';

interface SkipLink {
  id: string;
  label: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

const defaultLinks: SkipLink[] = [
  { id: 'main-content', label: 'Skip to main content' },
  { id: 'navigation', label: 'Skip to navigation' },
  { id: 'search', label: 'Skip to search' },
];

export const SkipLinks: React.FC<SkipLinksProps> = ({ links = defaultLinks }) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.tabIndex = -1;
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav 
      className="sr-only focus-within:not-sr-only focus-within:absolute focus-within:top-0 focus-within:left-0 focus-within:z-[9999] focus-within:w-full"
      aria-label="Skip navigation"
    >
      <ul className="focus-within:bg-background-primary focus-within:p-4 focus-within:shadow-lg">
        {links.map((link) => (
          <li key={link.id} className="focus-within:inline-block focus-within:mr-4">
            <a
              href={`#${link.id}`}
              onClick={(e) => handleClick(e, link.id)}
              className="focus:not-sr-only focus:inline-block focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-md focus:no-underline hover:bg-primary-700"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};