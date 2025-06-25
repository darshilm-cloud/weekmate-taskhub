import { useContext } from "react";
import { SocketContext } from "../context/SocketContext"; // Adjust the import path as necessary
import { checkNotificationType } from "../util/NotificationTypeCheck";
export const useSocketAction = () => {
  const socket = useContext(SocketContext);

  const emitEvent = async (event, payload) => {
    if (socket) {
      await socket.emit(event, payload);
    }
  };

  const listenEvent = (event, callback) => {
    if (socket) {
      socket.on(event, callback);

      return () => socket.off(event, callback);
    }

    // return () => {
    //   socket.off(event);
    // };
  };
  const showBrowserNotification = (title, msg, type) => {
    if ("Notification" in window) {
      if (Notification.permission !== "denied") {
        Notification.requestPermission().then((permission) => {
          if (permission === "granted") {
            new Notification(title, {
              body: msg,
              icon: "/favicon.svg",
            });
            // Play sound using HTML5 Audio
            const audio = new Audio("/notification.mp3");
            audio
              .play()
              .catch((error) =>
                console.error("Error playing the notification sound:", error)
              );
            // Add click event to the notification
            Notification.onclick = () => {
              let url =
                checkNotificationType(type)?.url ||
                "https://dev-pms.elsnerdev.co/";
                window.focus();
                window.location.href = url;
            };
          }
        });
      }
    }
    return () => {};
  };

  return { socket, emitEvent, listenEvent, showBrowserNotification };
};
