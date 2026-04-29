import React, { useRef, useEffect, useState } from "react";
import MyAvatar from "../Avatar/MyAvatar";
import { Select, Tag } from "antd";
import { CloseCircleOutlined } from "@ant-design/icons";
// import { removeTitle } from "../../util/nameFilter";

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
    const displayName = getDisplayName(item) || "-";
    return (
      <Tag
        closable={closable}
        onClose={onClose}
        style={{
          background: "#f3f4f6",
          border: "none",
          borderRadius: "6px",
          padding: "2px 8px",
          fontSize: "13px",
          color: "#374151",
          display: "inline-flex",
          alignItems: "center",
          margin: "2px",
        }}
      >
        {displayName}
      </Tag>
    );
  };

  const filteredOptions = listData
    .filter((ele) =>
      getDisplayName(ele)
        .toLowerCase()
        .includes((search || "").toLowerCase())
    )
    .map((ele) => {
      const isSelected = values.includes(ele?._id);
      return {
        value: ele?._id,
        label: (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <span style={{ fontWeight: isSelected ? "700" : "400", color: "#1f2937" }}>
              {getDisplayName(ele) || "-"}
            </span>
          </div>
        ),
      };
    })
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
        suffixIcon={null}
        dropdownStyle={{ borderRadius: "8px", padding: "4px" }}
        {...otherProps}
      />
    </div>
  );
};

export default MultiSelect;
