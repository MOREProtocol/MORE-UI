export const daysFromSeconds = (time: number) => time / 60 / 60 / 24;
export const hoursFromSeconds = (time: number) => time / 60 / 60;
export const minutesFromSeconds = (time: number) => time / 60;

export const formattedTime = (time: number) =>
  daysFromSeconds(time) < 1
    ? hoursFromSeconds(time) < 1
      ? minutesFromSeconds(time)
      : hoursFromSeconds(time)
    : daysFromSeconds(time);

export const timeText = (time: number) =>
  daysFromSeconds(time) < 1 ? (hoursFromSeconds(time) < 1 ? 'minutes' : 'hours') : 'days';

export const formatTimeRemaining = (seconds: number) => {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];

  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.length > 0 ? parts.join(' ') : '0s';
};
