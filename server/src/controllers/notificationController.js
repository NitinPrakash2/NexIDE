import { NotificationService } from "../services/notificationService.js";
import { asyncHandler, ApiResponse } from "../utils/index.js";

const notificationService = new NotificationService();

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.list(req.user.id, req.query);
  ApiResponse.ok("Notifications fetched", result).send(res);
});

export const markAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAsRead(req.params.id, req.user.id);
  ApiResponse.ok("Notification marked as read").send(res);
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllAsRead(req.user.id);
  ApiResponse.ok("All notifications marked as read").send(res);
});

export const deleteNotification = asyncHandler(async (req, res) => {
  await notificationService.delete(req.params.id, req.user.id);
  ApiResponse.ok("Notification deleted").send(res);
});

export const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user.id);
  ApiResponse.ok("Unread count fetched", { count }).send(res);
});
