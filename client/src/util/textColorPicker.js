module.exports = function textColorPicker(color) {
    let r, g, b;
  
    // If hex color
    if (color.startsWith("#")) {
      color = color.slice(1);
  
      if (color.length === 3) {
        r = parseInt(color[0] + color[0], 16);
        g = parseInt(color[1] + color[1], 16);
        b = parseInt(color[2] + color[2], 16);
      } else if (color.length === 6) {
        r = parseInt(color.slice(0, 2), 16);
        g = parseInt(color.slice(2, 4), 16);
        b = parseInt(color.slice(4, 6), 16);
      }
    } else {
      // If RGB color
      const rgb = color.match(/\d+/g);
      if (rgb) {
        [r, g, b] = rgb.map(Number);
      }
    }
  
    // Ensure r, g, and b are numbers
    if (r === undefined || g === undefined || b === undefined) {
      return "#000000"; // Default to black if color is not valid
    }
  
    // Calculate brightness
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return white for dark backgrounds and black for light backgrounds
    return brightness > 155 ? "#000000" : "#FFFFFF";
  }
  