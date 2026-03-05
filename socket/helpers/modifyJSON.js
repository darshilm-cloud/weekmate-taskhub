const fs = require('fs').promises;
const path = require('path');

class SimpleQueue {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async enqueue(task) {
    this.queue.push(task);
    if (!this.isProcessing) {
      this.isProcessing = true;
      await this.processQueue();
    }
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      await task();
    }
    this.isProcessing = false;
  }
}

class ModifyFile {
  constructor() {
    this.queue = new SimpleQueue();
  }

  addUserIDInJson = async (userId, socketId) => {
    return new Promise((resolve) => {
      this.queue.enqueue(async () => {
        try {
          const filePath = path.join(__dirname, "../socketData.json"); // Adjust the path as necessary
          let data = {};

          // Check if file exists, if not create it`
          try {
            const fileData = await fs.readFile(filePath, "utf8");
            data = JSON.parse(fileData);
          } catch (error) {
            if (error.code === "ENOENT") {
              console.log("File not found. Creating new file.");
              await fs.writeFile(filePath, JSON.stringify({}));
            } else {
              throw error;
            }
          }

          // Update data with new userId and socketId
          data[userId] = socketId;

          // Remove the 'undefined' key
          delete data.undefined;

          // Write updated data back to file
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));

          resolve(true);
        } catch (error) {
          console.log("🚀 ~ ModifyFile ~ addUserIDInJson= ~ error:", error);
          resolve(false);
        }
      });
    });
  };

  removeBySocketId = async (socketId) => {
    return new Promise((resolve) => {
      this.queue.enqueue(async () => {
        try {
          const filePath = path.join(__dirname, "../socketData.json");
          let data = {};

          // Read and parse the file
          const fileData = await fs.readFile(filePath, "utf8");
          data = JSON.parse(fileData);

          // Find the userId with the given socketId and delete it
          for (const userId in data) {
            if (data[userId] === socketId) {
              delete data[userId];
              break; // Stop the loop once the user is found
            }
          }

          // Write updated data back to file
          await fs.writeFile(filePath, JSON.stringify(data, null, 2));
          resolve(true);
        } catch (error) {
          console.log("🚀 ~ ModifyFile ~ removeBySocketId= ~ error:", error);
          resolve(false);
        }
      });
    });
  };
}

module.exports = new ModifyFile();
