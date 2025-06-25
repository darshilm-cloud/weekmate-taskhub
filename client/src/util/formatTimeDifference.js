export const calculateTimeDifference = (createdAt) => {
  const currentDate = new Date();
  const createdDate = new Date(createdAt);
  const timeDifferenceInMilliseconds = currentDate - createdDate;
  const timeDifferenceInSeconds = Math.floor(timeDifferenceInMilliseconds / 1000);
  const timeDifferenceInMinutes = Math.floor(timeDifferenceInMilliseconds / (1000 * 60));

  return formatTimeDifference(timeDifferenceInMinutes, timeDifferenceInSeconds);
};

const formatTimeDifference = (timeDifferenceInMinutes, timeDifferenceInSeconds) => {
  const days = Math.floor(timeDifferenceInMinutes / 1440);
  const now = new Date();
  const pastDate = new Date(now.getTime() - timeDifferenceInMinutes * 60 * 1000);

  const years = now.getFullYear() - pastDate.getFullYear();
  const months = now.getMonth() - pastDate.getMonth();
  const totalMonths = years * 12 + months;
  const remainingDays = days - Math.floor(totalMonths * 30.44);

  if (timeDifferenceInSeconds < 60) {
    return formatSeconds(timeDifferenceInSeconds);
  } else if (timeDifferenceInMinutes < 60) {
    return formatMinutes(timeDifferenceInMinutes);
  } else if (timeDifferenceInMinutes < 1440) {
    return formatHoursAndMinutes(timeDifferenceInMinutes);
  } else if (days < 30) {
    return formatDays(days);
  } else if (totalMonths < 12) {
    return formatMonths(totalMonths);
  } else {
    const yearPart = formatYears(years);
    if (months > 0) {
      const monthPart = formatMonths(months);
      return `${yearPart}`;
    }
    return yearPart;
  }
};

const formatSeconds = (seconds) => {
  return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
};

const formatMinutes = (minutes) => {
  return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
};

const formatHoursAndMinutes = (minutes) => {
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours > 1 ? "s" : ""} ago`;
};

const formatDays = (days) => {
  return `${days} day${days !== 1 ? "s" : ""} ago`;
};

const formatMonths = (months) => {
  return `${months} month${months !== 1 ? "s" : ""} ago`;
};

const formatYears = (years) => {
  return `${years} year${years !== 1 ? "s" : ""} ago`;
};
