import { useState } from "react";

import { avatarColor, initials } from "../../lib/avatar";
import type { SourceInfo } from "../../types";
import styles from "./Avatar.module.css";

interface Props {
  source: SourceInfo;
  size?: number;
}

export function Avatar({ source, size = 40 }: Props) {
  const [failed, setFailed] = useState(false);
  const px = `${size}px`;

  if (source.logo && !failed) {
    return (
      <img
        className={styles.logo}
        style={{ width: px, height: px }}
        src={source.logo}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={styles.initials}
      style={{
        width: px,
        height: px,
        backgroundColor: avatarColor(source.key),
        fontSize: `${Math.round(size * 0.34)}px`,
      }}
      aria-hidden
    >
      {initials(source.label)}
    </span>
  );
}
