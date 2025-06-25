import React, { useState, useEffect } from "react";
import { Tooltip, Avatar, Skeleton } from "antd";
import UtilFunctions from "../../util/UtilFunctions";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";

const MyAvatar = ({ userName, src, key, alt, isThumbnail = true }) => {
  const [isLoading, setIsLoading] = useState(true); // Assume initial loading state
  let avtar_resolution =
    isThumbnail == true
      ? `${Service.HRMS_Base_URL}/uploads/thumbnail_emp_images/${src}`
      : `${Service.HRMS_Base_URL}/uploads/emp_images/${src}`;

  useEffect(() => {
    let image;
    const handleImageLoad = () => {
      setIsLoading(false);
    };

    if (src) {
      image = new Image();
      image.onload = handleImageLoad;
      image.onerror = handleImageLoad;
      image.src = avtar_resolution;
      console.log(image.src, "image.src");
    } else {
      setIsLoading(false);
    }

    return () => {
      if (image) {
        image.removeEventListener("load", handleImageLoad);
      }
    };
  }, [src]);
  const managerAvatar = src
    ? avtar_resolution
    : UtilFunctions.generateAvatarFromName(userName, "30px", "30px");

  const avatarContent = isLoading ? (
    <Skeleton.Avatar size="default" shape="circle" active />
  ) : (
    <Avatar src={managerAvatar} key={key} alt={alt} />
  );

  return <Tooltip title={removeTitle(userName)}>{avatarContent}</Tooltip>;
};

export default MyAvatar;
