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
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};
