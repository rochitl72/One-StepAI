"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Variant = "sage" | "solution" | "user";

export default function MentorMessageContent({
  content,
  variant,
}: {
  content: string;
  variant: Variant;
}) {
  const codeAccent =
    variant === "solution"
      ? "bg-orange-950/80 text-orange-100 border border-orange-500/20"
      : "bg-zinc-950/80 text-emerald-100/90 border border-emerald-500/20";

  if (variant === "user") {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  return (
    <div
      className={`mentor-md text-[11px] leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0`}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (props) => (
            <h4 className="text-sm font-semibold text-white mt-3 mb-1.5 first:mt-0" {...props} />
          ),
          h2: (props) => (
            <h4 className="text-sm font-semibold text-white mt-3 mb-1.5 first:mt-0" {...props} />
          ),
          h3: (props) => (
            <h4 className="text-[12px] font-semibold text-white mt-2.5 mb-1 first:mt-0" {...props} />
          ),
          h4: (props) => <h4 className="text-[12px] font-semibold text-zinc-100 mt-2 mb-1" {...props} />,
          p: (props) => <p className="mb-2 text-zinc-300 last:mb-0 break-words" {...props} />,
          ul: (props) => (
            <ul className="list-disc pl-4 mb-2 space-y-1 text-zinc-300 last:mb-0" {...props} />
          ),
          ol: (props) => (
            <ol className="list-decimal pl-4 mb-2 space-y-1 text-zinc-300 last:mb-0" {...props} />
          ),
          li: (props) => <li className="break-words pl-0.5" {...props} />,
          strong: (props) => <strong className="font-semibold text-zinc-100" {...props} />,
          a: (props) => (
            <a className="text-violet-400 underline underline-offset-2 hover:text-violet-300" {...props} />
          ),
          blockquote: (props) => (
            <blockquote
              className="border-l-2 border-zinc-600 pl-2 my-2 text-zinc-400 italic"
              {...props}
            />
          ),
          hr: () => <hr className="border-zinc-700 my-3" />,
          pre: ({ children }) => (
            <pre
              className={`my-2 p-2.5 rounded-lg overflow-x-auto text-[10px] font-mono ${codeAccent} max-w-full whitespace-pre-wrap break-words`}
            >
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            const isFenced = typeof className === "string" && className.startsWith("language-");
            if (isFenced) {
              return (
                <code className={`${className} block break-words`} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`px-1 py-0.5 rounded text-[10px] font-mono ${codeAccent}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          table: (props) => (
            <div className="overflow-x-auto my-2 max-w-full">
              <table className="text-[10px] border border-zinc-700 rounded" {...props} />
            </div>
          ),
          th: (props) => (
            <th className="border border-zinc-700 px-2 py-1 bg-zinc-800 text-left" {...props} />
          ),
          td: (props) => <td className="border border-zinc-700 px-2 py-1 break-words" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
