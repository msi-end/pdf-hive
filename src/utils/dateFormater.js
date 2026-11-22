export const formatDate = (timestamp, withTime = false) => {
  if (!timestamp) return "—";
  const dateObj = new Date(timestamp);
  const date = dateObj.toLocaleDateString("en-GB");
  if (!withTime) return date;
  const timeStr = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${timeStr}`;
};

export const formatSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
