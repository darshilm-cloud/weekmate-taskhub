import React, { useRef, useEffect, useState } from "react";
import MyAvatar from "../Avatar/MyAvatar";
import { Select } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
import { removeTitle } from "../../util/nameFilter";

const MultiSelect = ({
  maxTagCount = 3,
  onSearch,
  onChange,
  values = [],
  listData = [],
  search = "",
  showTagLabel = false,
  ...otherProps
}) => {
  const getDisplayName = (item) =>
    item?.full_name ||
    item?.name ||
    item?.title ||
    item?.client_name ||
    item?.company_name ||
    item?.username ||
    "";

  const wrapperRef = useRef(null);
  const [dynamicMaxTagCount, setDynamicMaxTagCount] = useState(maxTagCount);

  const calculateMaxTagCount = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const calculatedMaxTagCount = Math.floor(rect.width / 50) - 1 || 1;

      setDynamicMaxTagCount(calculatedMaxTagCount);
    }
  };

  // Log dimensions on mount and when values change
  useEffect(() => {
    // Use a small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      calculateMaxTagCount();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [values]);

  // Add resize listener to recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      calculateMaxTagCount();
    };

    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const tagRender = (props) => {
    const { value, closable, onClose } = props;
    const item = listData.find((item) => item?._id === value);
    const displayName = removeTitle(getDisplayName(item) || "-");
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: showTagLabel ? "6px" : "0",
          maxWidth: "100%",
        }}
      >
        <MyAvatar
          userName={getDisplayName(item) || "-"}
          src={item?.emp_img || item?.profile_image || item?.avatar || item?.image}
          key={item?._id}
          alt={getDisplayName(item)}
        />
        {showTagLabel && (
          <span
            style={{
              maxWidth: "120px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {displayName}
          </span>
        )}
        <span
          onClick={onClose}
          style={{
            cursor: "pointer",
            position: "relative",
            top: "-10px",
            left: "-6px",
            width: "5px",
            height: "5px",
          }}
        >
          {closable && <CloseCircleOutlined />}
        </span>
      </span>
    );
  };

  const filteredOptions = listData
    .filter((ele) =>
      getDisplayName(ele)
        .toLowerCase()
        .includes((search || "").toLowerCase())
    )
    .map((ele) => ({
      value: ele?._id,
      label: (
        <>
          <MyAvatar
            userName={getDisplayName(ele) || "-"}
            src={ele?.emp_img || ele?.profile_image || ele?.avatar || ele?.image}
            key={ele?._id}
            alt={getDisplayName(ele)}
          />
          {removeTitle(getDisplayName(ele) || "-")}
        </>
      ),
    }))
    .filter((option) => option.value);

  const selectedOptions = filteredOptions.filter((option) =>
    values.includes(option.value)
  );
  const unselectedOptions = filteredOptions.filter(
    (option) => !values.includes(option.value)
  );

  const sortedOptions = [...selectedOptions, ...unselectedOptions];

  return (
    <div ref={wrapperRef}>
      <Select
        mode="multiple"
        style={{ width: "100%" }}
        showSearch
        maxTagCount={dynamicMaxTagCount}
        filterOption={false}
        onSearch={onSearch}
        onChange={onChange}
        value={values}
        tagRender={tagRender}
        options={sortedOptions}
        onFocus={calculateMaxTagCount}
        {...otherProps}
      />
    </div>
  );
};

export default MultiSelect;
