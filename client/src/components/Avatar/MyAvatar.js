import React, { useState, useEffect } from "react";
import { Tooltip, Avatar, Skeleton } from "antd";
import UtilFunctions from "../../util/UtilFunctions";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";

const MyAvatar = ({ userName, src, key, alt, isThumbnail = true }) => {
  const [isLoading, setIsLoading] = useState(true); // Assume initial loading state
  const localBase = process.env.REACT_APP_API_URL || Service.Server_Base_URL || "";
  let avtar_resolution = src
    ? src.startsWith("http")
      ? src
      : `${localBase}/public/${src}`
    : "";

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
    : UtilFunctions.generateAvatarFromName(userName, "25px", "25px");

  const avatarContent = isLoading ? (
    <Skeleton.Avatar size="default" shape="circle" active />
  ) : (
    <Avatar src={managerAvatar} key={key} alt={alt} />
  );

  return <Tooltip title={removeTitle(userName)}>{avatarContent}</Tooltip>;
};

export default MyAvatar;
