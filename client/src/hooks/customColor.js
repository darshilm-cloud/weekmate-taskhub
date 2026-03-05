import { useState, useEffect } from "react";
import config from '../settings/config.json'


const useUserColors = (comments) => {
  const [userColors, setUserColors] = useState({});

  useEffect(() => {
    const newUserColors = { ...userColors };

    comments.forEach(({ sender, createdBy: { full_name = "" } = {} }) => {
      if (sender) {
        if (!newUserColors[sender]) {
          const availableColors = config.COLORS.filter(
            (color) => !Object.values(newUserColors).includes(color)
          );
          newUserColors[sender] =
            availableColors[Math.floor(Math.random() * availableColors.length)];
        }
      } else {
        if (!newUserColors[full_name]) {
          const availableColors = config.COLORS.filter(
            (color) => !Object.values(newUserColors).includes(color)
          );
          newUserColors[full_name] =
            availableColors[Math.floor(Math.random() * availableColors.length)];
        }
      }
    });

    setUserColors(newUserColors);
  }, [comments]);

  return userColors;
};

export default useUserColors;
