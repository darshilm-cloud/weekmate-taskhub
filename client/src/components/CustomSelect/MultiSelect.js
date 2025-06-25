import React from "react";
import MyAvatar from "../Avatar/MyAvatar";
import {  Select } from "antd";
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
  const tagRender = (props) => {
    const {  value, closable, onClose } = props;
    const item = listData.find((item) => item._id === value);
    return (
      <>
        {/* <Tooltip placement="top" title={item?.full_name}> */}
          <MyAvatar
            userName={item?.full_name || "-"}
            src={item?.emp_img}
            key={item?._id}
            alt={item?.full_name}
          />
        {/* </Tooltip> */}
        <span
          onClick={onClose}
          style={{
            cursor: "pointer",
            position: "relative",
            top: "-10px",
            left: "-6px",
            width: "5px",
            hight: "5px",
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
    

  const selectedOptions = filteredOptions.filter(option =>
    values.includes(option.value)
  );
  const unselectedOptions = filteredOptions.filter(option =>
    !values.includes(option.value)
  );  
  
  const sortedOptions = [...selectedOptions, ...unselectedOptions];

  return (
    <Select
      mode="multiple"
      style={{ width: "100%" }}
      showSearch
      maxTagCount={maxTagCount}
      filterOption={false}
      onSearch={onSearch}
      onChange={onChange}
      value={values} // Using IDs for value
      tagRender={tagRender} // Custom tag rendering     
        options={sortedOptions}
      {...otherProps}
    />
  );
};

export default MultiSelect;







