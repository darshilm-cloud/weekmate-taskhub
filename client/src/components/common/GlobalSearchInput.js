import React, { useRef, forwardRef } from 'react';
import { Input } from 'antd';
import './GlobalSearchInput.css';

const GlobalSearchInput = forwardRef(({ 
  value, 
  onChange, 
  onSearch, 
  onKeyUp,
  placeholder = "Search...",
  className = "",
  allowClear = true,
  ...props 
}, ref) => {
  const internalRef = useRef(null);
  const searchRef = ref || internalRef;

  const handleChange = (e) => {
    onChange?.(e.target.value);
  };

  const handleSearch = (searchValue) => {
    onSearch?.(searchValue);
  };

  return (
    <Input.Search
      ref={searchRef}
      placeholder={placeholder}
      value={value}
      onChange={handleChange}
      onSearch={handleSearch}
      onKeyUp={onKeyUp}
      allowClear={allowClear}
      className={`global-search-input ${className}`}
      {...props}
    />
  );
});

GlobalSearchInput.displayName = 'GlobalSearchInput';

export default GlobalSearchInput;
