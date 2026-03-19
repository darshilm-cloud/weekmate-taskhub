const { socketEvents } = require("../settings/socketEventName");

class ProjectExpenseEventSocketFn {
  projectExpenseUpdatedEvent = async (socket, io) => {
    socket.on(socketEvents.PROJECT_EXPENSE_UPDATED, async (data) => {
      try {
        // Broadcast the update to all connected clients
        io.emit(socketEvents.PROJECT_EXPENSE_UPDATED, data);
        console.log("Project expense update broadcasted:", data);
      } catch (error) {
        console.log("🚀 ~ PROJECT_EXPENSE_UPDATED : socket.on ~ error:", error);
      }
    });
  };
}

module.exports = new ProjectExpenseEventSocketFn();
