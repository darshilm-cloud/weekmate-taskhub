import React from "react";
import "./Unauthorised.css"

const Unauthorised = () => {
  return (
    <div className="unauthorised-container">
      <h1>404 Unauthorized</h1>
      <p>Oops! It seems you're not authorized to access this page.</p>
      <a href={`${process.env.REACT_APP_URL}project-list`} className="back-button">
        Back to Home
      </a>
    </div>
  );
};
// `${process.env.REACT_APP_URL}project-list`
export default Unauthorised;
