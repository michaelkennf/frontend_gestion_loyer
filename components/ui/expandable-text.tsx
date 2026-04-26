"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type ExpandableTextProps = {
  text: string;
  maxLength?: number;
  className?: string;
};

export function ExpandableText({ text, maxLength = 110, className }: ExpandableTextProps) {
  const [expanded, setExpanded] = useState(false);
  const cleanText = useMemo(() => text.trim(), [text]);
  const isLong = cleanText.length > maxLength;

  if (!cleanText) return null;

  const visible = !isLong || expanded ? cleanText : `${cleanText.slice(0, maxLength)}...`;

  return (
    <div className={className}>
      <p className="text-xs text-foreground">{visible}</p>
      {isLong && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="h-auto px-0 py-0 text-xs"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Voir moins" : "Voir plus"}
        </Button>
      )}
    </div>
  );
}
