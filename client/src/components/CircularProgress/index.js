import React from "react";
import PropTypes from "prop-types"; 
import { LoadingOutlined } from '@ant-design/icons';

function CircularProgress({className}) {
  return <div className={`loader ${className}`}>
  {/* <img className="loader-img" src={loader} alt="loader"/> */}
  <LoadingOutlined style={{ fontSize: '50px', color: '#038fde' }} />
</div>
}
CircularProgress.propTypes = {
  className: PropTypes.string 
};
export default CircularProgress;
