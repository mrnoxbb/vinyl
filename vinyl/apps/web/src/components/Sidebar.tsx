import Link from "next/link";

type SidebarLink = {
  href: string;
  label: string;
  description: string;
};

const links: SidebarLink[] = [
  { href: "/", label: "Home", description: "Protected home feed and activity." },
  { href: "/explore", label: "Explore", description: "Discovery views and editorials." },
  { href: "/search", label: "Search", description: "Find tracks, albums, and artists." },
  { href: "/diary", label: "Diary", description: "Log recent listens." },
  { href: "/lists", label: "Lists", description: "Curate public and private picks." },
  { href: "/notifications", label: "Alerts", description: "Follows, likes, and updates." }
];

export function Sidebar() {
  return (
    <div className="vinyl-sidebar">
      <div className="sidebar-brand">
        <h1>VINYL</h1>
        <p>Social music reviews for people who still care about the album art.</p>
      </div>
      <nav className="sidebar-links" aria-label="Primary">
        {links.map((link) => (
          <Link key={link.href} className="sidebar-link" href={link.href}>
            <strong>{link.label}</strong>
            <span>{link.description}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
