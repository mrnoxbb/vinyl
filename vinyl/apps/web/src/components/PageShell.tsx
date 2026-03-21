import type { ReactNode } from "react";

type PageShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  children?: ReactNode;
};

export function PageShell({
  title,
  description,
  eyebrow = "VINYL",
  children
}: PageShellProps) {
  return (
    <section className="page-card">
      <p className="page-eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-description">{description}</p>
      {children ? <div className="page-meta">{children}</div> : null}
    </section>
  );
}
