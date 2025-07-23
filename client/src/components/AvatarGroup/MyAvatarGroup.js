import React, { useState, useEffect } from "react";
import { Tooltip, Avatar, Skeleton } from "antd";
import UtilFunctions from "../../util/UtilFunctions";
import Service from "../../service";
import { removeTitle } from "../../util/nameFilter";

const MyAvatarGroup = ({
  record,
  maxCount = 2,
  maxPopoverTrigger,
  size = "small",
  customStyle,
  height = "20px",
  width = "20px",
}) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (record && record.length > 0) {
      let loadedCount = 0;

      const handleImageLoad = () => {
        loadedCount++;
        if (loadedCount === record.length) {
          setIsLoading(false);
        }
      };

      record.forEach((data) => {
        if (data?.emp_img) {
          const image = new Image();
          image.onload = handleImageLoad;
          image.onerror = handleImageLoad;
          image.src = `${Service.HRMS_Base_URL}/uploads/thumbnail_emp_images/${data?.emp_img}`;
        } else {
          handleImageLoad(); // If there's no image, consider it loaded
        }
      });
    } else {
      setIsLoading(false);
    }
  }, [record]);

  return (
    <Avatar.Group
      maxCount={maxCount}
      maxPopoverTrigger={maxPopoverTrigger}
      size={size}
      maxStyle={{
        color: "#f56a00",
        backgroundColor: "#fde3cf",
        cursor: "pointer",
        ...customStyle,
      }}
    >
      {isLoading
        ? Array.from({ length: maxCount }, (_, index) => (
            <Skeleton.Avatar
              key={index}
              size={size}
              shape="circle"
              active
              style={{ marginRight: 8 }}
            />
          ))
        : record &&
          record.map((data) => (
            <Tooltip title={removeTitle(data?.name)} key={data._id}>
              <Avatar
                style={customStyle}
                key={data._id}
                size={size}
                src={
                  data?.emp_img
                    ? `${Service.HRMS_Base_URL}/uploads/thumbnail_emp_images/${data?.emp_img}`
                    : UtilFunctions.generateAvatarFromName(
                        data.name,
                        height,
                        width
                      )
                }
              />
            </Tooltip>
          ))}
    </Avatar.Group>
  );
};

export default MyAvatarGroup;
