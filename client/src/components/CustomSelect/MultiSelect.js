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
  ...otherProps
}) => {
  const wrapperRef = useRef(null);
  const [dynamicMaxTagCount, setDynamicMaxTagCount] = useState(maxTagCount);

  const calculateMaxTagCount = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const calculatedMaxTagCount = Math.floor(rect.width / 50) - 1 || 1;
      
      console.log("Select Wrapper Dimensions:");
      console.log(`Width: ${rect.width}px`);
      console.log(`Calculated maxTagCount: ${calculatedMaxTagCount}`);
      
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
    const item = listData.find((item) => item._id === value);
    return (
      <>
        <MyAvatar
          userName={item?.full_name || "-"}
          src={item?.emp_img}
          key={item?._id}
          alt={item?.full_name}
        />
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
      </>
    );
  };

  const filteredOptions = listData
    .filter((ele) =>
      ele.full_name?.toLowerCase()?.includes(search?.toLowerCase())
    )
    .map((ele) => ({
      value: ele._id,
      label: (
        <>
          <MyAvatar
            userName={ele?.full_name}
            src={ele?.emp_img}
            key={ele?._id}
            alt={ele?.full_name}
          />
          {removeTitle(ele.full_name)}
        </>
      ),
    }));

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

