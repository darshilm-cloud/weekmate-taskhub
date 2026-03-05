export const removeTitle = (name) => {
  if (name) {
    const title = ["Miss.", "Mr.", "Mrs.", "Ms.", "Miss", "Mr", "Mrs", "Ms"];
    const nameParts = name.split(" ");

    // Check if the first part is a title and remove it
    if (title.includes(nameParts[0])) {
      nameParts.shift();
    }

    // Join the remaining parts back into a single string
    return nameParts.join(" ");
  } else {
    return name;
  }
};
