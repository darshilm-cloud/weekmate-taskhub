import React, { useState } from "react";

const ImageUpload = ({
  initialImageUrl,
  onFileUpload,
  validation = {
    height: 300,
    width: 300,
    type: ["image/png", "image/jpeg", "image/jpg"],
  },
}) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      if (validation.type.includes(selectedFile.type)) {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onloadend = () => {
          const image = new Image();
          image.src = reader.result;
          image.onload = () => {
            if (
              image.width === validation.width &&
              image.height === validation.height
            ) {
              setImageUrl(reader.result);
              setFile(selectedFile);
              onFileUpload(selectedFile); // Send file data to parent component
            } else {
              alert(
                `Image dimensions must be ${validation.width} x ${validation.height}`
              );
            }
          };
        };
      } else {
        alert("Please select a valid image file (PNG/JPEG).");
      }
    }
  };

  const handleImageRemove = () => {
    setImageUrl("");
    setFile(null);
  };

  return (
    <div>
      {imageUrl ? (
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={imageUrl}
            alt="Selected"
            style={{
              maxWidth: "100px",
              maxHeight: "100px",
              marginRight: "10px",
            }}
          />
          <button className="ant-delete" onClick={handleImageRemove}>
            Remove
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept=".png, .jpg, .jpeg"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
};

export default ImageUpload;
