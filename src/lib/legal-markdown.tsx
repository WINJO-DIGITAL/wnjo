import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";

/**
 * Reads a legal document kept as Markdown in content/legal and turns it into page markup. It understands only what
 * those documents use: headings, paragraphs, bullet lists, block quotes, tables, rules, bold text and links. Titles
 * (the first level-one heading) are skipped because the page hero already shows them.
 */
export function readLegal(name: "terms" | "dpa"): string {
  return readFileSync(join(process.cwd(), "content", "legal", `${name}.md`), "utf8");
}

function inline(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\([^)]+\))/g).flatMap((part, i) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return [<a key={`l${i}`} href={link[2]}>{link[1]}</a>];
    return part.split(/(\*\*[^*]+\*\*)/g).map((piece, j) => {
      const bold = /^\*\*([^*]+)\*\*$/.exec(piece);
      return bold ? <strong key={`b${i}-${j}`}>{bold[1]}</strong> : <span key={`t${i}-${j}`}>{piece}</span>;
    });
  });
}

export function renderLegal(md: string): ReactNode[] {
  const lines = md.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const k = () => `legal-${key++}`;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(<h2 key={k()}>{inline(line.slice(3))}</h2>);
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(<h3 key={k()}>{inline(line.slice(4))}</h3>);
      i++;
      continue;
    }
    if (line.trim() === "---") {
      out.push(<hr key={k()} />);
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(
        <ul key={k()}>
          {items.map((item, n) => (
            <li key={n}>{inline(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        <blockquote key={k()}>
          {quoted
            .filter((q) => q.trim() !== "")
            .map((q, n) => (
              <p key={n}>{inline(q)}</p>
            ))}
        </blockquote>,
      );
      continue;
    }
    if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^-+$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      out.push(
        <table key={k()}>
          <thead>
            <tr>
              {head.map((c, n) => (
                <th key={n}>{inline(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((r, n) => (
              <tr key={n}>
                {r.map((c, m) => (
                  <td key={m}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#|- |>|\||---)/.test(lines[i])
    ) {
      para.push(lines[i].trim());
      i++;
    }
    if (para.length === 0) {
      para.push(line.trim());
      i++;
    }
    out.push(<p key={k()}>{inline(para.join(" "))}</p>);
  }
  return out;
}
